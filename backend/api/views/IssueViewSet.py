from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from api.models import Issue, IssueUpdate
from api.serializers import IssueSerializer, IssueUpdateSerializer


class IssueViewSet(viewsets.ModelViewSet):
    """
    ViewSet สำหรับจัดการกระทู้/ปัญหา
    
    Features:
    - สร้าง/ดู/แก้ไข/ลบ กระทู้
    - เพิ่มการอัปเดตความคืบหน้า
    - เปลี่ยนสถานะ
    - กรองตามสถานะ/หมวดหมู่/ความสำคัญ
    """
    queryset = Issue.objects.all()
    serializer_class = IssueSerializer

    def get_queryset(self):
        """กรองข้อมูลตาม query parameters"""
        queryset = Issue.objects.all()
        
        # กรองตามสถานะ
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # กรองตามหมวดหมู่
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        # กรองตามความสำคัญ
        priority = self.request.query_params.get('priority', None)
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # กรองตามผู้สร้าง
        created_by = self.request.query_params.get('created_by', None)
        if created_by:
            queryset = queryset.filter(created_by_id=created_by)
        
        # กรองตามผู้ที่ได้รับมอบหมาย
        assigned_to = self.request.query_params.get('assigned_to', None)
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        
        return queryset.select_related(
            'created_by', 
            'assigned_to', 
            'resolved_by'
        ).prefetch_related('updates')

    @action(detail=True, methods=['post'])
    def add_update(self, request, pk=None):
        """
        เพิ่มการอัปเดตความคืบหน้า
        
        Body:
        {
            "message": "ข้อความอัปเดต",
            "updated_by_id": 1,
            "new_status": "in_progress" (optional)
        }
        """
        issue = self.get_object()
        message = request.data.get('message')
        updated_by_id = request.data.get('updated_by_id')
        new_status = request.data.get('new_status')
        
        if not message:
            return Response(
                {'error': 'กรุณาระบุข้อความอัปเดต'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # บันทึกสถานะเก่า
        old_status = issue.status
        
        # สร้างการอัปเดต
        update = IssueUpdate.objects.create(
            issue=issue,
            message=message,
            updated_by_id=updated_by_id,
            old_status=old_status,
            new_status=new_status if new_status else old_status
        )
        
        # ถ้ามีการเปลี่ยนสถานะ
        if new_status and new_status != old_status:
            issue.status = new_status
            issue.save()
        
        serializer = IssueUpdateSerializer(update)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """
        ปิดกระทู้/แก้ไขปัญหาเสร็จสิ้น
        
        Body:
        {
            "resolved_by_id": 1,
            "message": "แก้ไขเรียบร้อยแล้ว"
        }
        """
        issue = self.get_object()
        resolved_by_id = request.data.get('resolved_by_id')
        message = request.data.get('message', 'แก้ไขปัญหาเรียบร้อยแล้ว')
        
        if not resolved_by_id:
            return Response(
                {'error': 'กรุณาระบุผู้แก้ไข'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # อัปเดตข้อมูล
        old_status = issue.status
        issue.status = 'resolved'
        issue.resolved_by_id = resolved_by_id
        issue.resolved_at = timezone.now()
        issue.save()
        
        # บันทึกการอัปเดต
        IssueUpdate.objects.create(
            issue=issue,
            message=message,
            updated_by_id=resolved_by_id,
            old_status=old_status,
            new_status='resolved'
        )
        
        serializer = self.get_serializer(issue)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """
        เปิดกระทู้ใหม่
        
        Body:
        {
            "updated_by_id": 1,
            "message": "เปิดกระทู้ใหม่"
        }
        """
        issue = self.get_object()
        updated_by_id = request.data.get('updated_by_id')
        message = request.data.get('message', 'เปิดกระทู้ใหม่')
        
        old_status = issue.status
        issue.status = 'open'
        issue.resolved_by = None
        issue.resolved_at = None
        issue.save()
        
        # บันทึกการอัปเดต
        IssueUpdate.objects.create(
            issue=issue,
            message=message,
            updated_by_id=updated_by_id,
            old_status=old_status,
            new_status='open'
        )
        
        serializer = self.get_serializer(issue)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        สถิติกระทู้/ปัญหา
        """
        total = Issue.objects.count()
        open_count = Issue.objects.filter(status='open').count()
        in_progress = Issue.objects.filter(status='in_progress').count()
        resolved = Issue.objects.filter(status='resolved').count()
        
        by_category = {}
        for choice in Issue.CATEGORY_CHOICES:
            category_code = choice[0]
            category_name = choice[1]
            count = Issue.objects.filter(category=category_code).count()
            by_category[category_name] = count
        
        by_priority = {}
        for choice in Issue.PRIORITY_CHOICES:
            priority_code = choice[0]
            priority_name = choice[1]
            count = Issue.objects.filter(priority=priority_code).count()
            by_priority[priority_name] = count
        
        return Response({
            'total': total,
            'by_status': {
                'open': open_count,
                'in_progress': in_progress,
                'resolved': resolved,
            },
            'by_category': by_category,
            'by_priority': by_priority,
        })


class IssueUpdateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet สำหรับดูการอัปเดตทั้งหมด (Read-only)
    """
    queryset = IssueUpdate.objects.all()
    serializer_class = IssueUpdateSerializer

    def get_queryset(self):
        """กรองตาม issue_id ถ้ามี"""
        queryset = IssueUpdate.objects.all()
        issue_id = self.request.query_params.get('issue_id', None)
        
        if issue_id:
            queryset = queryset.filter(issue_id=issue_id)
        
        return queryset.select_related('issue', 'updated_by')