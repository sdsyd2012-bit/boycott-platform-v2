from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .images import localize_image
from .models import Article, Category, Product, ProductDiscovery, Video
from .serializers import (
    ArticleSerializer,
    CategorySerializer,
    ProductDiscoverySerializer,
    ProductSerializer,
    VideoSerializer,
)


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = str(request.data.get('username', '')).strip()
        password = str(request.data.get('password', ''))
        user = authenticate(username=username, password=password)

        if user is None or not user.is_staff:
            return Response(
                {
                    'detail': (
                        'بيانات الدخول غير صحيحة، أو أن هذا الحساب لا يملك '
                        'صلاحيات الإدارة.'
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                'token': token.key,
                'username': user.username,
                'display_name': user.get_full_name() or user.username,
                'is_superuser': user.is_superuser,
            },
            status=status.HTTP_200_OK,
        )


class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            {
                'products': Product.objects.filter(is_deleted=False).count(),
                'products_hidden': Product.objects.filter(is_deleted=True).count(),
                'boycotted': Product.objects.filter(
                    is_boycotted=True, is_deleted=False
                ).count(),
                'categories': Category.objects.count(),
                'articles': Article.objects.filter(is_deleted=False).count(),
                'videos': Video.objects.filter(is_deleted=False).count(),
                'discoveries_pending': ProductDiscovery.objects.filter(
                    status=ProductDiscovery.STATUS_PENDING
                ).count(),
            },
            status=status.HTTP_200_OK,
        )


class DiscoveryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = ProductDiscovery.objects.all().select_related('category')
    serializer_class = ProductDiscoverySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter in dict(ProductDiscovery.STATUS_CHOICES):
            queryset = queryset.filter(status=status_filter)
        return queryset


class ApproveDiscoveryView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        discovery = get_object_or_404(ProductDiscovery, pk=pk)

        local_image = localize_image(discovery.image_url)

        product, created = Product.objects.update_or_create(
            barcode=discovery.barcode,
            defaults={
                'name': discovery.name,
                'brand_name': discovery.brand_name,
                'category': discovery.category,
                'is_boycotted': discovery.is_boycotted,
                'image_url': local_image or discovery.image_url,
                'reason': discovery.reason,
                'description': discovery.reason,
                'is_deleted': False,
            },
        )

        discovery.status = ProductDiscovery.STATUS_APPROVED
        discovery.reviewed_at = timezone.now()
        discovery.save(update_fields=['status', 'reviewed_at'])

        return Response(
            {
                'ok': True,
                'created': created,
                'product': ProductSerializer(product).data,
            },
            status=status.HTTP_200_OK,
        )


class RejectDiscoveryView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        discovery = get_object_or_404(ProductDiscovery, pk=pk)
        discovery.status = ProductDiscovery.STATUS_REJECTED
        discovery.reviewed_at = timezone.now()
        discovery.save(update_fields=['status', 'reviewed_at'])
        return Response({'ok': True}, status=status.HTTP_200_OK)


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Product.objects.all().select_related('category')
    serializer_class = ProductSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ArticleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer

    def perform_create(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class VideoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Video.objects.all()
    serializer_class = VideoSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)
