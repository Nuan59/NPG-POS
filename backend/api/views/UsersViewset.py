from rest_framework import generics, viewsets
from api.serializers import UserSerializer
from api.models import User
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

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