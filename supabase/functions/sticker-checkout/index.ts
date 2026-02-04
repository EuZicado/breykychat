import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mercadoPagoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    if (!mercadoPagoToken) {
      return new Response(
        JSON.stringify({ error: "Mercado Pago not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { pack_id, user_id } = await req.json();

    if (!pack_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing pack_id or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pack details
    const { data: pack, error: packError } = await supabase
      .from("sticker_packs")
      .select("*, creator:creator_id(username, display_name)")
      .eq("id", pack_id)
      .single();

    if (packError || !pack) {
      return new Response(
        JSON.stringify({ error: "Pack not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("user_id", user_id)
      .eq("pack_id", pack_id)
      .maybeSingle();

    if (existingPurchase) {
      return new Response(
        JSON.stringify({ error: "Already purchased" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Mercado Pago preference
    const preference = {
      items: [
        {
          id: pack_id,
          title: `Pack de Figurinhas: ${pack.name}`,
          description: pack.description || "Pack de figurinhas LONIX",
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(pack.price),
        },
      ],
      payer: {
        email: "", // Will be filled by MP
      },
      back_urls: {
        success: `${req.headers.get("origin")}/stickers?success=true`,
        failure: `${req.headers.get("origin")}/stickers?error=true`,
        pending: `${req.headers.get("origin")}/stickers?pending=true`,
      },
      auto_return: "approved",
      external_reference: JSON.stringify({ pack_id, user_id }),
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mercadoPagoToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error("Mercado Pago error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to create payment preference" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpData = await mpResponse.json();

    return new Response(
      JSON.stringify({
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
