from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests

class PostalCodeLookupView(APIView):
    """
    API สำหรับค้นหาอำเภอและจังหวัดจากรหัสไปรษณีย์
    """
    # ปิด authentication ชั่วคราว
    permission_classes = []
    
    def get(self, request):
        postal_code = request.query_params.get('postal_code')
        
        if not postal_code:
            return Response(
                {'error': 'กรุณาระบุรหัสไปรษณีย์'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ใช้ Thailand Postal Code API (ฟรี)
        try:
            # Option 1: ใช้ API ของไปรษณีย์ไทย
            url = f"https://thaiaddress-git-main-mikkipastel.vercel.app/api/v1/thailand/zip-codes/{postal_code}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                if data and len(data) > 0:
                    result = data[0]  # เอาผลลัพธ์แรก
                    
                    return Response({
                        'postal_code': postal_code,
                        'subdistrict': result.get('subdistrict', ''),
                        'district': result.get('district', ''),
                        'province': result.get('province', ''),
                        'subdistrict_th': result.get('subdistrict_th', ''),
                        'district_th': result.get('district_th', ''),
                        'province_th': result.get('province_th', ''),
                    })
                else:
                    return Response(
                        {'error': 'ไม่พบข้อมูลรหัสไปรษณีย์นี้'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Fallback: ใช้ข้อมูลจาก hardcoded
                return self.get_postal_code_fallback(postal_code)
                
        except Exception as e:
            print(f"Error looking up postal code: {e}")
            return self.get_postal_code_fallback(postal_code)
    
    def get_postal_code_fallback(self, postal_code):
        """
        Fallback: ข้อมูลรหัสไปรษณีย์พื้นฐาน (สำหรับกรณี API ไม่ทำงาน)
        """
        # ข้อมูลรหัสไปรษณีย์บางส่วน (ตัวอย่าง)
        postal_data = {
            '54000': {'district': 'เมืองแพร่', 'province': 'แพร่'},
            '54140': {'district': 'ร้องกวาง', 'province': 'แพร่'},
            '10000': {'district': 'พระนคร', 'province': 'กรุงเทพมหานคร'},
            '50000': {'district': 'เมืองเชียงใหม่', 'province': 'เชียงใหม่'},
            '74000': {'district': 'เมืองสมุทรสาคร', 'province': 'สมุทรสาคร'},
            # เพิ่มรหัสไปรษณีย์อื่นๆ ตามต้องการ
        }
        
        if postal_code in postal_data:
            data = postal_data[postal_code]
            return Response({
                'postal_code': postal_code,
                'district': data['district'],
                'province': data['province'],
            })
        else:
            return Response(
                {'error': 'ไม่พบข้อมูลรหัสไปรษณีย์นี้ในระบบ'},
                status=status.HTTP_404_NOT_FOUND
            )