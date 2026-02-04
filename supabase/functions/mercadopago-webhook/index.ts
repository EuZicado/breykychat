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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    if (body.type === "payment") {
      const paymentId = body.data?.id;
      
      if (!paymentId) {
        return new Response(JSON.stringify({ error: "No payment ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get payment details from Mercado Pago
      const mercadoPagoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
      
      if (!mercadoPagoToken) {
        console.error("Mercado Pago token not configured");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${mercadoPagoToken}`,
          },
        }
      );

      if (!paymentResponse.ok) {
        console.error("Failed to fetch payment details");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payment = await paymentResponse.json();
      console.log("Payment status:", payment.status);

      if (payment.status === "approved") {
        // Parse external reference
        let externalRef;
        try {
          externalRef = JSON.parse(payment.external_reference);
        } catch (e) {
          console.error("Failed to parse external reference:", e);
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { pack_id, user_id } = externalRef;
        const amount = Number(payment.transaction_amount);

        // Calculate commissions (50/50 split)
        const creatorCommission = amount * 0.5;
        const platformCommission = amount * 0.5;

        // Get pack to find creator
        const { data: pack, error: packError } = await supabase
          .from("sticker_packs")
          .select("creator_id, name")
          .eq("id", pack_id)
          .single();

        if (packError || !pack) {
          console.error("Pack not found:", packError);
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create purchase record
        const { error: purchaseError } = await supabase
          .from("user_purchases")
          .insert({
            user_id,
            pack_id,
            amount,
            payment_id: String(paymentId),
          });

        if (purchaseError) {
          console.error("Failed to create purchase:", purchaseError);
        }

        // Update pack sales count
        await supabase.rpc("increment_sales_count", { p_pack_id: pack_id });

        // Add commission to creator wallet
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", pack.creator_id)
          .single();

        if (creatorProfile) {
          await supabase
            .from("profiles")
            .update({
              wallet_balance: Number(creatorProfile.wallet_balance) + creatorCommission,
            })
            .eq("id", pack.creator_id);
        }

        // Create transaction records
        await supabase.from("transactions").insert([
          {
            user_id: pack.creator_id,
            amount: creatorCommission,
            type: "commission",
            status: "completed",
            reference_id: String(paymentId),
            description: `Comissão: ${pack.name}`,
          },
          {
            user_id,
            amount,
            type: "purchase",
            status: "completed",
            reference_id: String(paymentId),
            description: `Compra: ${pack.name}`,
          },
        ]);

        console.log("Payment processed successfully");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
