
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = "re_i8H1wMXe_GwswDGSsyk4NNMj3JBzUaM4L";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
    type: "new_order" | "order_status" | "new_ticket";
    data: any;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { type, data }: EmailPayload = await req.json();
        let subject = "";
        let html = "";
        let to = ["office@harps.hu"]; // Default to Admin
        let from = "Rendelés <onboarding@resend.dev>"; // Default Resend setup

        if (!RESEND_API_KEY) {
            console.error("Missing RESEND_API_KEY");
            return new Response(JSON.stringify({ error: "Missing API Key" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        switch (type) {
            case "new_order":
                subject = `Új rendelés érkezett! #${data.order_number}`;
                to = ["office@harps.hu", data.user_email]; // Send to Admin & User
                html = `
          <h1>Köszönjük a rendelését!</h1>
          <p>Kedves Partnerünk,</p>
          <p>Rendelését sikeresen rögzítettük.</p>
          <p><strong>Rendelés száma:</strong> ${data.order_number}</p>
          <p><strong>Végösszeg:</strong> ${data.total_amount} Ft</p>
          <br>
          <p>Üdvözlettel,<br>HARPS Global Csapata</p>
        `;
                break;

            case "order_status":
                subject = `Rendelés státusz frissítés: #${data.order_number}`;
                to = [data.user_email];
                const statusLabel = data.status === 'confirmed' ? 'Visszaigazolva' :
                    data.status === 'shipped' ? 'Szállítás alatt' :
                        data.status === 'completed' ? 'Teljesítve' : data.status;
                html = `
          <h1>Rendelésének státusza megváltozott</h1>
          <p>Az alábbi rendelésének új státusza: <strong>${statusLabel}</strong></p>
          <p><strong>Rendelés száma:</strong> ${data.order_number}</p>
          <br>
          <p>Üdvözlettel,<br>HARPS Global Csapata</p>
        `;
                break;

            case "new_ticket":
                subject = `Új Támogatási Jegy: ${data.subject}`;
                to = ["office@harps.hu"];
                html = `
          <h1>Új támogatási kérelem érkezett</h1>
          <p><strong>Feladó:</strong> ${data.user_email} (${data.company_name})</p>
          <p><strong>Tárgy:</strong> ${data.subject}</p>
          <p><strong>Üzenet:</strong></p>
          <pre>${data.message}</pre>
        `;
                break;
        }

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: from,
                to: to,
                subject: subject,
                html: html,
            }),
        });

        const dataRes = await res.json();

        return new Response(JSON.stringify(dataRes), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
};

serve(handler);
