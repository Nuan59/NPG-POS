from rest_framework import generics
from api.serializers import CustomerOrdersSerializer
from api.models import Order
from rest_framework.permissions import IsAuthenticated


class CustomerOrdersList(generics.ListAPIView):
    """Listings all orders from given user"""
    serializer_class = CustomerOrdersSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Order.objects.filter(customer=self.kwargs['pk'])
        return queryset
