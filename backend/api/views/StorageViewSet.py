from rest_framework import viewsets
from api.serializers import StorageSerializer
from api.models import Storage, Bike, StorageTransfer
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class StorageViewSet(viewsets.ModelViewSet):
    """Listing all registered Storages"""
    queryset = Storage.objects.all().order_by('storage_name')
    serializer_class = StorageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # ✅ ปิด pagination

    def destroy(self, request, *args, **kwargs):
        storageBikes = Bike.objects.filter(storage_place=self.get_object())

        if len(storageBikes) > 0:
            return Response({'success': False, 'message': 'Transfer products out of this storage before deleting it!'}, status=400)
        else:
            storageDelete = self.get_object()
            storageDelete.delete()
            return Response({'success': True, 'message': 'storage deleted successfully'})

    @action(methods=['POST'], detail=False)
    def transfer(self, request):
        """Transfer bikes between storages"""

        destinationId = request.data['destination']
        originId = request.data['origin']

        destinationStorage = get_object_or_404(Storage, pk=destinationId)
        originStorage = get_object_or_404(Storage, pk=originId)

        transferInstance = StorageTransfer.objects.create(
            origin=originStorage,
            destination=destinationStorage
        )

        errors = []

        for bikeId in request.data['bikes']:
            try:
                bike = Bike.objects.get(pk=bikeId)
                bike.storage_place = destinationStorage
                bike.save()
                transferInstance.bikes.add(bike)
            except Bike.DoesNotExist:
                errors.append(bikeId)

        transferInstance.save()

        return Response({'message': 'Products transferred successfully', 'errors': errors, 'data':transferInstance.id})