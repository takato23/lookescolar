const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupPricing() {
  try {
    const eventId = '83070ba2-738e-4038-ab5e-0c42fe4a2880';
    
    // Check if price list already exists
    const { data: existingPriceList } = await supabase
      .from('price_lists')
      .select('id')
      .eq('event_id', eventId)
      .single();
    
    let priceListId;
    
    if (existingPriceList) {
      priceListId = existingPriceList.id;
      console.log('Using existing price list:', priceListId);
    } else {
      // Create price list
      const { data: priceList, error: priceListError } = await supabase
        .from('price_lists')
        .insert({
          event_id: eventId,
          name: 'Lista de Precios Básica',
          active: true
        })
        .select('id')
        .single();
      
      if (priceListError) {
        console.error('Error creating price list:', priceListError);
        return;
      }
      
      priceListId = priceList.id;
      console.log('Created new price list:', priceListId);
    }
    
    // Check if price items exist
    const { data: existingItems } = await supabase
      .from('price_list_items')
      .select('id, name, price_cents')
      .eq('price_list_id', priceListId);
    
    if (existingItems && existingItems.length > 0) {
      console.log('Existing price items:', existingItems);
      return;
    }
    
    // Create price items
    const priceItems = [
      {
        price_list_id: priceListId,
        name: 'Foto Individual',
        description: 'Foto individual impresa 10x15cm',
        price_cents: 1000, // $10.00 ARS
        photo_count: 1,
        active: true
      },
      {
        price_list_id: priceListId,
        name: 'Pack 5 fotos',
        description: 'Pack de 5 fotos individuales',
        price_cents: 4500, // $45.00 ARS (descuento)
        photo_count: 5,
        active: true
      },
      {
        price_list_id: priceListId,
        name: 'Pack 10 fotos',
        description: 'Pack completo de 10 fotos',
        price_cents: 8000, // $80.00 ARS (mayor descuento)
        photo_count: 10,
        active: true
      }
    ];
    
    const { data: items, error: itemsError } = await supabase
      .from('price_list_items')
      .insert(priceItems)
      .select('*');
    
    if (itemsError) {
      console.error('Error creating price items:', itemsError);
      return;
    }
    
    console.log('Created price items:', items);
    console.log('✅ Pricing setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up pricing:', error);
  }
}

setupPricing();