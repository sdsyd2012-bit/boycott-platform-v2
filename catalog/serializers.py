from rest_framework import serializers

from .models import Article, Category, Product, ProductDiscovery, Video


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'icon',
            'updated_at',
            'created_at',
        ]


class ProductDiscoverySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = ProductDiscovery
        fields = [
            'id',
            'barcode',
            'name',
            'brand_name',
            'category',
            'category_name',
            'is_boycotted',
            'image_url',
            'reason',
            'status',
            'submitted_at',
            'reviewed_at',
        ]
        read_only_fields = ['id', 'status', 'submitted_at', 'reviewed_at']

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        category_val = data.get('category')
        if category_val:
            try:
                cat_id = int(category_val)
                if not Category.objects.filter(pk=cat_id).exists():
                    data['category'] = None
            except (ValueError, TypeError):
                data['category'] = None
        return super().to_internal_value(data)


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id',
            'barcode',
            'barcodes',
            'name',
            'brand_name',
            'is_boycotted',
            'category',
            'image_url',
            'reason',
            'description',
            'alternatives',
            'is_deleted',
            'updated_at',
            'created_at',
        ]


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = [
            'id',
            'title',
            'embed_url',
            'thumbnail_url',
            'is_deleted',
            'updated_at',
            'created_at',
        ]


class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = [
            'id',
            'title',
            'slug',
            'cover_url',
            'excerpt',
            'content',
            'is_deleted',
            'updated_at',
            'created_at',
        ]
