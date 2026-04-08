from rest_framework import viewsets
from api.serializers import BikeSerializer
from api.models import Bike, Storage
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers, status
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

        if storage_id is not None:
            try:
                filterStorage = Storage.objects.get(pk=storage_id)
                queryset = queryset.filter(storage_place=filterStorage).filter(sold=False)
            except Storage.DoesNotExist:
                return queryset.none()

        if category:
            queryset = queryset.filter(category=category)

        return queryset

    def create(self, request, *args, **kwargs):
        """Override create to handle duplicate chassi gracefully"""
        chassi = request.data.get('chassi') or request.data.get('chassis', '')
        if chassi and Bike.objects.filter(chassi=chassi).exists():
            return Response(
                {'error': f'Bike with chassi "{chassi}" already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)

    @action(methods=['POST'], detail=False)
    def import_inventory(self, request):
        bikesImport = request.data.get('bikes', [])
        storageId = request.data.get('storage')

        if not storageId:
            return Response(
                {'error': 'storage field is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        storage = get_object_or_404(Storage, pk=storageId)
        errors = []
        created = []

        for bike in bikesImport:
            chassi_value = bike.get('chassi') or bike.get('chassis', '')

            # ✅ ตรวจ duplicate chassi ก่อน insert
            if Bike.objects.filter(chassi=chassi_value).exists():
                errors.append(f'Chassi "{chassi_value}" already exists — skipped.')
                continue

            try:
                newInstance = Bike.objects.create(
                    model_name=bike['model_name'],
                    model_code=bike['model_code'],
                    engine=bike['engine'],
                    chassi=chassi_value,
                    registration_plate=bike.get('registration_plate', ''),
                    color=bike.get('color', ''),
                    notes=bike.get('notes', ''),
                    category=bike.get('category', 'new'),
                    sale_price=bike.get('sale_price'),
                    brand=bike.get('brand', 'Honda'),
                    storage_place=storage,
                    received_date=date.today()
                )
                created.append(newInstance.id)
            except Exception as e:
                errors.append(f'Chassi "{chassi_value}": {str(e)}')

        return Response({
            'message': f'{len(created)} bike(s) imported successfully.',
            'created_ids': created,
            'errors': errors,
        }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)