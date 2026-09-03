from rest_framework import generics, viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models.deletion import ProtectedError

from api.serializers import UserSerializer
from api.models import User

class UsersViewset(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        name = request.data['name']
        username = request.data['username']
        password = request.data['password']
        role = request.data['role']
        # ✅ บันทึก permissions เฉพาะ role="emp" (adm เข้าได้ทุกหน้าอยู่แล้วไม่ต้องเก็บ)
        permissions = request.data.get('permissions') if role == 'emp' else None

        try:
            newUser = User.objects.create(
                name=name,
                username=username,
                role=role,
                permissions=permissions or {}
            )

            newUser.set_password(password)
            newUser.save()
            serializer = UserSerializer(newUser)

            return Response({'success': True, 'new_user': serializer.data})
        except:
            return Response({'success': False, 'message': "username already exists"}, status=400)

    def update(self, request, **kwargs):
        name = request.data['name']
        username = request.data['username']
        password = request.data['password']
        role = request.data['role']

        userToEdit = User.objects.get(pk=kwargs['pk'])
        
        userToEdit.name = name
        userToEdit.username = username
        userToEdit.role = role

        # ✅ บันทึก permissions ที่ส่งมาจริงๆ (จุดนี้เดิมไม่เคยแตะ permissions เลย
        # ทำให้ checkbox สิทธิ์ที่ตั้งไว้ไม่เคยถูกบันทึกลงฐานข้อมูลจริง)
        if 'permissions' in request.data:
            userToEdit.permissions = request.data.get('permissions') if role == 'emp' else {}

        if password != "":
            userToEdit.set_password(password)
        
        userToEdit.save()

        serializer = UserSerializer(userToEdit)

        return Response({'success': True, 'edit_user': serializer.data})

    def destroy(self, request, *args, **kwargs):
        """
        ลบพนักงาน

        ✅ Order.seller เป็น ForeignKey(on_delete=models.PROTECT) - ถ้าพนักงานคนนี้เคยเป็น
        seller ในออเดอร์ไหนก็ตาม Django จะไม่ยอมลบเด็ดขาด (ตั้งใจกันไว้แบบนี้ กันประวัติขาย
        กลายเป็น "ไม่รู้ใครขาย") เดิมโค้ดไม่ได้ดักจับ error นี้ไว้ ทำให้กลายเป็น 500 เฉยๆ
        ไม่บอกสาเหตุจริงให้ผู้ใช้เห็น ตอนนี้ดักจับแล้วส่ง error message ที่อ่านเข้าใจได้แทน
        """
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    'success': False,
                    'message': 'ลบพนักงานคนนี้ไม่ได้ เพราะมีประวัติการขายผูกอยู่ในระบบ '
                                'กรุณาใช้ "ปิดการใช้งาน" แทน เพื่อไม่ให้ login เข้าระบบได้อีก '
                                'โดยยังเก็บประวัติการขายเดิมไว้ครบ',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )