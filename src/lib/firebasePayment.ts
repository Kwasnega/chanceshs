/**
 * Firebase Payment & Entitlement System
 * 
 * Production-ready payment infrastructure with Firebase Realtime Database
 */

import { rtdb } from './firebase';
import { ref, set, get, update, push, remove } from 'firebase/database';

// Product Types
export enum ProductType {
  PREMIUM_REPORT = 'premium_report',
  EARLY_ALERT = 'early_alert',
  BUNDLE_COMPLETE = 'bundle_complete',
  BUNDLE_FULL = 'bundle_full',
  SHS_KIT_BUNDLER = 'shs_kit_bundler'
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// Feature Types
export enum FeatureType {
  PREMIUM_REPORT = 'premium_report',
  EARLY_ALERT = 'early_alert',
  SHS_KIT_PREVIEW = 'shs_kit_preview'
}

// Product Interface
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: ProductType;
  features: string[];
  includes?: ProductType[];
  isActive: boolean;
}

// Payment Interface
export interface Payment {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  paymentProvider: string;
  providerTransactionId?: string;
  providerResponse?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}

// Entitlement Interface
export interface Entitlement {
  id: string;
  userId: string;
  paymentId: string;
  featureType: FeatureType;
  isActive: boolean;
  expiresAt?: string;
  grantedAt: string;
  metadata?: any;
}

// Initialize Products in Firebase
export async function initializeProducts() {
  const productsRef = ref(rtdb, 'products');

  const products: Product[] = [
    {
      id: ProductType.PREMIUM_REPORT,
      name: 'Premium Strategy Report',
      description: 'Complete placement intelligence with 15-25 school probability ranking',
      price: 40.00,
      currency: 'GHS',
      type: ProductType.PREMIUM_REPORT,
      features: [
        '15-25 school probability ranking',
        'Safe/Competitive/Dream breakdown',
        'Risk analysis',
        'Smart application strategy',
        'Parent-friendly summary',
        'Instant PDF download'
      ],
      isActive: true
    },
    {
      id: ProductType.EARLY_ALERT,
      name: 'Early Placement Alert',
      description: 'Instant SMS and WhatsApp placement notifications',
      price: 15.00,
      currency: 'GHS',
      type: ProductType.EARLY_ALERT,
      features: [
        'Instant SMS placement alert',
        'WhatsApp notification',
        'Zero stress on results day',
        'One-time payment'
      ],
      isActive: true
    },
    {
      id: ProductType.BUNDLE_COMPLETE,
      name: 'Complete Peace of Mind',
      description: 'Strategy Report + Early Alert bundle',
      price: 45.00,
      currency: 'GHS',
      type: ProductType.BUNDLE_COMPLETE,
      features: [
        'Full strategy report',
        'Instant placement alerts',
        'Complete peace of mind'
      ],
      includes: [ProductType.PREMIUM_REPORT, ProductType.EARLY_ALERT],
      isActive: true
    },
    {
      id: ProductType.BUNDLE_FULL,
      name: 'Full Experience',
      description: 'Report + Alert + Kit Preview',
      price: 55.00,
      currency: 'GHS',
      type: ProductType.BUNDLE_FULL,
      features: [
        'Everything in Complete bundle',
        'SHS kit system preview',
        'Premium support'
      ],
      includes: [ProductType.PREMIUM_REPORT, ProductType.EARLY_ALERT],
      isActive: true
    },
    {
      id: ProductType.SHS_KIT_BUNDLER,
      name: 'SHS Kit Bundler',
      description: 'Everything after placement — checklist, kit bundle, verified local vendors',
      price: 25.00,
      currency: 'GHS',
      type: ProductType.SHS_KIT_BUNDLER,
      features: [
        'Full SHS checklist',
        'One-click kit bundle',
        'Verified local vendors',
        'Convenience-based value'
      ],
      isActive: true
    }
  ];

  for (const product of products) {
    await set(ref(rtdb, `products/${product.id}`), product);
  }
}

// Get Product by ID
export async function getProduct(productId: string): Promise<Product | null> {
  const snapshot = await get(ref(rtdb, `products/${productId}`));
  return snapshot.exists() ? snapshot.val() : null;
}

// Get All Active Products
export async function getActiveProducts(): Promise<Product[]> {
  const snapshot = await get(ref(rtdb, 'products'));
  if (!snapshot.exists()) return [];
  
  const products: Product[] = [];
  snapshot.forEach((child) => {
    const product = child.val();
    if (product.isActive) {
      products.push(product);
    }
  });
  
  return products;
}

// Create Payment Record
export async function createPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const paymentRef = push(ref(rtdb, 'payments'));
  const paymentId = paymentRef.key!;
  
  const paymentData: Payment = {
    ...payment,
    id: paymentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await set(paymentRef, paymentData);
  return paymentId;
}

// Update Payment Status
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  providerTransactionId?: string,
  providerResponse?: any
): Promise<void> {
  const updates: any = {
    status,
    updatedAt: new Date().toISOString()
  };
  
  if (providerTransactionId) {
    updates.providerTransactionId = providerTransactionId;
  }
  
  if (providerResponse) {
    updates.providerResponse = providerResponse;
  }
  
  if (status === PaymentStatus.SUCCESSFUL) {
    updates.verifiedAt = new Date().toISOString();
  }
  
  await update(ref(rtdb, `payments/${paymentId}`), updates);
}

// Get Payment by Reference
export async function getPaymentByReference(reference: string): Promise<Payment | null> {
  const snapshot = await get(ref(rtdb, 'payments'));
  if (!snapshot.exists()) return null;
  
  let payment: Payment | null = null;
  snapshot.forEach((child) => {
    const p = child.val();
    if (p.reference === reference) {
      payment = p;
    }
  });
  
  return payment;
}

// Create Entitlement
export async function createEntitlement(
  userId: string,
  paymentId: string,
  featureType: FeatureType,
  expiresAt?: string
): Promise<string> {
  const entitlementRef = push(ref(rtdb, 'entitlements'));
  const entitlementId = entitlementRef.key!;
  
  const entitlement: Entitlement = {
    id: entitlementId,
    userId,
    paymentId,
    featureType,
    isActive: true,
    expiresAt,
    grantedAt: new Date().toISOString()
  };
  
  await set(entitlementRef, entitlement);
  
  // Update user entitlements
  await update(ref(rtdb, `users/${userId}/entitlements`), {
    [featureType]: true
  });
  
  return entitlementId;
}

// Check User Entitlement
export async function checkUserEntitlement(
  userId: string,
  featureType: FeatureType
): Promise<boolean> {
  const snapshot = await get(ref(rtdb, `users/${userId}/entitlements/${featureType}`));
  return snapshot.exists() ? snapshot.val() : false;
}

export async function getUserEntitlements(userId: string): Promise<Record<string, boolean>> {
  const snapshot = await get(ref(rtdb, `users/${userId}/entitlements`));
  if (!snapshot.exists()) {
    return {
      premium_report: false,
      early_alert: false,
      shs_kit_preview: false
    };
  }
  return snapshot.val();
}

// Grant Bundle Entitlements
export async function grantBundleEntitlements(
  userId: string,
  paymentId: string,
  includes: ProductType[]
): Promise<void> {
  for (const productType of includes) {
    let featureType: FeatureType;
    
    switch (productType) {
      case ProductType.PREMIUM_REPORT:
        featureType = FeatureType.PREMIUM_REPORT;
        break;
      case ProductType.EARLY_ALERT:
        featureType = FeatureType.EARLY_ALERT;
        break;
      default:
        featureType = FeatureType.SHS_KIT_PREVIEW;
    }
    
    await createEntitlement(userId, paymentId, featureType);
  }
}

// Create User
export async function createUser(userId: string, email?: string, phone?: string): Promise<void> {
  await set(ref(rtdb, `users/${userId}`), {
    email: email || null,
    phone: phone || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entitlements: {}
  });
}

// Get User
export async function getUser(userId: string): Promise<any> {
  const snapshot = await get(ref(rtdb, `users/${userId}`));
  return snapshot.exists() ? snapshot.val() : null;
}

// Log Webhook Event
export async function logWebhookEvent(
  eventType: string,
  payload: any,
  signature: string
): Promise<string> {
  const webhookRef = push(ref(rtdb, 'webhooks'));
  const webhookId = webhookRef.key!;
  
  await set(webhookRef, {
    eventType,
    payload,
    signature,
    processedAt: new Date().toISOString(),
    status: 'pending'
  });
  
  return webhookId;
}

// Update Webhook Status
export async function updateWebhookStatus(webhookId: string, status: string): Promise<void> {
  await update(ref(rtdb, `webhooks/${webhookId}`), { status });
}
