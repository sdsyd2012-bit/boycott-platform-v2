from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=1000, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Product(models.Model):
    barcode = models.CharField(max_length=100, unique=True, db_index=True)
    barcodes = models.JSONField(default=list, blank=True)
    name = models.CharField(max_length=255)
    brand_name = models.CharField(max_length=255, blank=True)
    is_boycotted = models.BooleanField(default=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
    )
    image_url = models.URLField(max_length=500, blank=True)
    reason = models.TextField(blank=True)
    description = models.TextField(blank=True)
    alternatives = models.JSONField(default=list, blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.name} ({self.barcode})'


class ProductDiscovery(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'قيد المراجعة'),
        (STATUS_APPROVED, 'مقبول'),
        (STATUS_REJECTED, 'مرفوض'),
    ]

    barcode = models.CharField(max_length=100, db_index=True)
    name = models.CharField(max_length=255)
    brand_name = models.CharField(max_length=255, blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='discoveries',
    )
    is_boycotted = models.BooleanField(default=True)
    image_url = models.URLField(max_length=500, blank=True)
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name_plural = 'product discoveries'

    def __str__(self):
        return f'{self.name} ({self.barcode})'


class Article(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    cover_url = models.URLField(max_length=500, blank=True)
    excerpt = models.TextField(blank=True)
    content = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title


class Video(models.Model):
    title = models.CharField(max_length=255)
    embed_url = models.URLField(max_length=500)
    thumbnail_url = models.URLField(max_length=500, blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title
