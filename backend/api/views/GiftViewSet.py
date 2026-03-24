from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from api.serializers import GiftSerializer
from api.models import Gift
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

class GiftViewSet(viewsets.ModelViewSet):
    """Listing all gifts in stock"""
    queryset = Gift.objects.all().order_by('name')
    serializer_class = GiftSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def add(self, request, pk=None):
        """Add products to existing stock"""
        gift = get_object_or_404(Gift, pk=pk)
        try:
            amount = int(request.data.get('amount'))
        except (TypeError, ValueError):
            return Response({"error": "Invalid amount"}, status=400)
        
        # Add the amount to the stock
        gift.stock += amount
        gift.save()

        return Response({"message": f"Added {amount} {gift.name}s to stock. New stock: {gift.stock}"}, status=200)
    

    @action(detail=True, methods=['post'])
    def update_price(self, request, pk=None):
        """Change gift price"""
        gift = get_object_or_404(Gift, pk=pk)
        try:
            new_price = int(request.data.get('price'))
        except (TypeError, ValueError):
            return Response({"error": "Invalid price"}, status=400)
        
        # Update the price of the gift
        gift.price = new_price
        gift.save()

        return Response({"message": f"{gift.name} price updated to {new_price}"}, status=200)