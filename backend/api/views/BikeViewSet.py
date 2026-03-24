from rest_framework import viewsets
from api.serializers import BikeSerializer
from api.models import Bike, Storage
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date
from rest_framework.permissions import IsAuthenticated

class BikeViewSet(viewsets.ModelViewSet):
    """Listing all registered bikes in stock"""
    serializer_class = BikeSerializer
    permission_classes = [IsAuthenticated, ]

    def get_queryset(self):
        queryset = Bike.objects.all().order_by('-id')

        storage_id = self.request.query_params.get('storage')
        category = self.request.query_params.get('category')

        # ✅ Filter ตาม storage
        if storage_id is not None:
            try:
                filterStorage = Storage.objects.get(pk=storage_id)
                queryset = queryset.filter(storage_place=filterStorage).filter(sold=False)
            except Storage.DoesNotExist:
                return queryset.none()

        # ✅ Filter ตาม category
        if category:
            queryset = queryset.filter(category=category)

        return queryset

    @action(methods=['POST'], detail=False)
    def import_inventory(self, request):
        bikesImport = request.data['bikes']
        storageId = request.data['storage']

        storage = get_object_or_404(Storage, pk=storageId)
        errors = []
        for bike in bikesImport:
            try:
                newInstance = Bike.objects.create(
                    model_name=bike['model_name'],
                    model_code=bike['model_code'],
                    engine=bike['engine'],
                    chassis=bike['chassis'],  # ✅ แก้เป็น chassis
                    registration_plate=bike['registration_plate'],
                    color=bike['color'],
                    notes=bike['notes'],
                    category=bike['category'],
                    sale_price=bike.get('sale_price'),
                    brand=bike['brand'],
                    storage_place=storage,
                    received_date=date.today()
                )
                newInstance.save()
            except Exception as e:
                errors.append(str(e))

        return Response({'message': 'products imported successfully!', 'errors': errors})