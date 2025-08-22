// Enhanced Product Pricing Service
// Handles complex pricing calculations for photos, products, and combos

import { 
  PhotoProduct, 
  ComboPackage, 
  EnhancedCartItem, 
  PriceCalculation, 
  ProductRecommendation,
  EventProductPricing,
  PricingType 
} from '@/lib/types/products';

export interface PricingContext {
  event_id: string;
  family_discount?: number; // percentage discount for families
  bulk_discount_threshold?: number; // minimum items for bulk discount
  bulk_discount_percentage?: number; // percentage discount for bulk
  tax_rate?: number; // tax percentage
}

export interface PricingRule {
  id: string;
  name: string;
  type: 'discount' | 'surcharge' | 'combo_bonus';
  condition: (items: EnhancedCartItem[], context: PricingContext) => boolean;
  calculate: (items: EnhancedCartItem[], context: PricingContext) => number;
  description: string;
}

class ProductPricingService {
  private pricing_rules: PricingRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Calculate total price for cart items with all discounts and rules
   */
  calculateCartTotal(
    items: EnhancedCartItem[],
    context: PricingContext,
    event_pricing?: EventProductPricing[]
  ): PriceCalculation {
    const breakdown: PriceCalculation['breakdown'] = [];
    let base_price = 0;
    let discounts = 0;
    let additions = 0;

    // Calculate base price for each item
    for (const item of items) {
      const unit_price = this.getItemPrice(item, context, event_pricing);
      const total_price = unit_price * item.quantity;
      base_price += total_price;

      breakdown.push({
        item_type: item.combo_id ? 'combo' : 'product',
        name: item.product_name,
        quantity: item.quantity,
        unit_price,
        total_price
      });
    }

    // Apply pricing rules
    for (const rule of this.pricing_rules) {
      if (rule.condition(items, context)) {
        const rule_amount = rule.calculate(items, context);
        
        if (rule.type === 'discount') {
          discounts += Math.abs(rule_amount);
          breakdown.push({
            item_type: 'discount',
            name: rule.name,
            quantity: 1,
            unit_price: -Math.abs(rule_amount),
            total_price: -Math.abs(rule_amount)
          });
        } else if (rule.type === 'surcharge') {
          additions += Math.abs(rule_amount);
          breakdown.push({
            item_type: 'product',
            name: rule.name,
            quantity: 1,
            unit_price: Math.abs(rule_amount),
            total_price: Math.abs(rule_amount)
          });
        }
      }
    }

    const subtotal = base_price - discounts + additions;
    const tax = context.tax_rate ? Math.round(subtotal * context.tax_rate / 100) : 0;
    const total = subtotal + tax;

    if (tax > 0) {
      breakdown.push({
        item_type: 'tax',
        name: 'Impuestos',
        quantity: 1,
        unit_price: tax,
        total_price: tax
      });
    }

    return {
      base_price,
      discounts,
      additions,
      subtotal,
      tax,
      total,
      breakdown
    };
  }

  /**
   * Get price for individual item considering event-specific pricing
   */
  private getItemPrice(
    item: EnhancedCartItem,
    context: PricingContext,
    event_pricing?: EventProductPricing[]
  ): number {
    // Check for event-specific pricing override
    if (event_pricing) {
      const override = event_pricing.find(ep => 
        ep.event_id === context.event_id &&
        ((ep.product_id && ep.product_id === item.product_id) ||
         (ep.combo_id && ep.combo_id === item.combo_id)) &&
        ep.is_active
      );
      
      if (override) {
        return override.override_price;
      }
    }

    // Use item's stored unit price
    return item.unit_price;
  }

  /**
   * Calculate combo pricing based on photos and included products
   */
  calculateComboPrice(
    combo: ComboPackage,
    photo_count: number,
    context: PricingContext,
    event_pricing?: EventProductPricing[]
  ): number {
    // Check for event-specific override
    if (event_pricing) {
      const override = event_pricing.find(ep => 
        ep.event_id === context.event_id &&
        ep.combo_id === combo.id &&
        ep.is_active
      );
      
      if (override) {
        return override.override_price;
      }
    }

    // Calculate based on pricing type
    switch (combo.pricing_type) {
      case 'fixed':
        return combo.base_price;
      
      case 'per_photo':
        return combo.base_price + (combo.price_per_photo || 0) * photo_count;
      
      case 'tiered':
        // Implement tiered pricing logic
        return this.calculateTieredPrice(combo, photo_count);
      
      default:
        return combo.base_price;
    }
  }

  /**
   * Calculate tiered pricing for combos
   */
  private calculateTieredPrice(combo: ComboPackage, photo_count: number): number {
    // Tiered pricing tiers can be stored in metadata
    const tiers = combo.metadata?.pricing_tiers as Array<{
      min_photos: number;
      max_photos?: number;
      price: number;
    }> || [];

    // Find appropriate tier
    const tier = tiers.find(t => 
      photo_count >= t.min_photos && 
      (!t.max_photos || photo_count <= t.max_photos)
    );

    return tier ? tier.price : combo.base_price;
  }

  /**
   * Generate product recommendations based on current cart
   */
  generateRecommendations(
    items: EnhancedCartItem[],
    available_products: PhotoProduct[],
    available_combos: ComboPackage[],
    context: PricingContext
  ): ProductRecommendation[] {
    const recommendations: ProductRecommendation[] = [];
    const current_total = this.calculateCartTotal(items, context).total;
    const photo_count = items.reduce((sum, item) => sum + item.quantity, 0);

    // Recommend combos if items can be combined for savings
    for (const combo of available_combos.filter(c => c.is_active)) {
      if (photo_count >= combo.min_photos && 
          (!combo.max_photos || photo_count <= combo.max_photos)) {
        
        const combo_price = this.calculateComboPrice(combo, photo_count, context);
        const savings = current_total - combo_price;
        
        if (savings > 0) {
          recommendations.push({
            combo,
            reason: 'best_value',
            confidence: Math.min(savings / current_total, 1),
            savings,
            description: `Ahorra ${this.formatCurrency(savings)} con el ${combo.name}`
          });
        }
      }
    }

    // Recommend featured products
    const featured_products = available_products.filter(p => p.is_featured && p.is_active);
    for (const product of featured_products.slice(0, 2)) {
      recommendations.push({
        product,
        reason: 'featured',
        confidence: 0.7,
        description: `Producto destacado: ${product.name}`
      });
    }

    // Sort by confidence and savings
    return recommendations
      .sort((a, b) => {
        if (a.savings && b.savings) {
          return b.savings - a.savings;
        }
        return b.confidence - a.confidence;
      })
      .slice(0, 3); // Return top 3 recommendations
  }

  /**
   * Validate pricing calculation
   */
  validatePricing(calculation: PriceCalculation): {
    is_valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for negative prices
    if (calculation.total < 0) {
      errors.push('El precio total no puede ser negativo');
    }

    // Check for unreasonable total
    if (calculation.total > 100000000) { // $1M limit
      errors.push('El precio total excede el límite máximo');
    }

    // Validate breakdown sums
    const breakdown_total = calculation.breakdown
      .reduce((sum, item) => sum + item.total_price, 0);
    
    if (Math.abs(breakdown_total - calculation.total) > 1) { // Allow 1 cent rounding
      errors.push('Error en el cálculo de precios');
    }

    return {
      is_valid: errors.length === 0,
      errors
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount_cents: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount_cents / 100);
  }

  /**
   * Initialize default pricing rules
   */
  private initializeDefaultRules(): void {
    // Bulk discount rule
    this.pricing_rules.push({
      id: 'bulk_discount',
      name: 'Descuento por cantidad',
      type: 'discount',
      condition: (items, context) => {
        const total_quantity = items.reduce((sum, item) => sum + item.quantity, 0);
        return total_quantity >= (context.bulk_discount_threshold || 5);
      },
      calculate: (items, context) => {
        const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        return Math.round(subtotal * (context.bulk_discount_percentage || 10) / 100);
      },
      description: 'Descuento por comprar 5 o más productos'
    });

    // Family discount rule
    this.pricing_rules.push({
      id: 'family_discount',
      name: 'Descuento familiar',
      type: 'discount',
      condition: (items, context) => {
        return (context.family_discount || 0) > 0;
      },
      calculate: (items, context) => {
        const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        return Math.round(subtotal * (context.family_discount || 0) / 100);
      },
      description: 'Descuento especial para familias'
    });

    // Free digital copy with physical prints
    this.pricing_rules.push({
      id: 'free_digital_with_print',
      name: 'Digital gratis con impresión',
      type: 'discount',
      condition: (items) => {
        const has_print = items.some(item => 
          item.product_specs.type === 'print' && item.quantity > 0
        );
        const has_digital = items.some(item => 
          item.product_specs.type === 'digital' && item.quantity > 0
        );
        return has_print && has_digital;
      },
      calculate: (items) => {
        const digital_items = items.filter(item => item.product_specs.type === 'digital');
        return digital_items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      },
      description: 'Digital gratuito al comprar impresiones'
    });
  }

  /**
   * Add custom pricing rule
   */
  addPricingRule(rule: PricingRule): void {
    this.pricing_rules.push(rule);
  }

  /**
   * Remove pricing rule
   */
  removePricingRule(rule_id: string): void {
    this.pricing_rules = this.pricing_rules.filter(rule => rule.id !== rule_id);
  }

  /**
   * Get active pricing rules
   */
  getPricingRules(): PricingRule[] {
    return [...this.pricing_rules];
  }
}

// Export singleton instance
export const productPricingService = new ProductPricingService();

// Export utility functions
export function calculateProductCartTotal(
  items: EnhancedCartItem[],
  context: PricingContext,
  event_pricing?: EventProductPricing[]
): PriceCalculation {
  return productPricingService.calculateCartTotal(items, context, event_pricing);
}

export function generateProductRecommendations(
  items: EnhancedCartItem[],
  available_products: PhotoProduct[],
  available_combos: ComboPackage[],
  context: PricingContext
): ProductRecommendation[] {
  return productPricingService.generateRecommendations(
    items, 
    available_products, 
    available_combos, 
    context
  );
}

export function formatProductPrice(amount_cents: number): string {
  return productPricingService.formatCurrency(amount_cents);
}