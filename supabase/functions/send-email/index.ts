import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ExcelJS from "https://esm.sh/exceljs@4.4.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// Brevo API Key
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
    type: string;
    data: Record<string, any>;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const payload: EmailPayload = await req.json();
        const { type, data } = payload;

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Fetch Template
        const { data: template, error: templateError } = await supabaseAdmin
            .from("email_templates")
            .select("subject, body, is_active")
            .eq("slug", type)
            .single();

        if (templateError || !template) {
            console.error("Template fetch error:", templateError);
            return new Response(JSON.stringify({ error: "Template not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 404,
            });
        }

        if (!template.is_active) {
            console.log(`Email template '${type}' is inactive. Skipping.`);
            return new Response(JSON.stringify({ message: "Template inactive" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        let subject = template.subject;
        let html = template.body;
        let toEmail = "";
        let attachments: any[] = [];


        const adminEmail = "peter.bene.business@gmail.com";

        if (type === "new_order_admin") {
            toEmail = adminEmail;

            const orderId = data.order_id;
            console.log("Processing order ID:", orderId);

            if (orderId) {
                const { data: orderData, error: orderError } = await supabaseAdmin
                    .from("orders")
                    .select(`
                        *,
                        profiles (company_name, email, tax_id),
                        order_items (
                            *,
                            products (name, sku)
                        )
                    `)
                    .eq("id", orderId)
                    .single();

                if (!orderError && orderData && orderData.order_items && orderData.order_items.length > 0) {
                    try {
                        const profile = orderData.profiles;
                        const address = orderData.shipping_address || {};

                        // Populate data variables for template replacement
                        data.company_name = profile?.company_name || '-';
                        data.tax_id = profile?.tax_id || '-';
                        data.company_email = profile?.email || '-';
                        data.site_name = address.site_name || '-';
                        data.shipping_address_text = address.address || '-';
                        data.contact_name = address.contact_name || '-';
                        data.contact_email = address.contact_email || '-';
                        data.contact_phone = address.contact_phone || '-';
                        data.total_amount = orderData.total_amount || 0;

                        // --- ExcelJS Generation ---
                        const workbook = new ExcelJS.Workbook();
                        const worksheet = workbook.addWorksheet('Rendelés');

                        // Headers
                        worksheet.columns = [
                            { header: 'Cikkszám', key: 'sku', width: 20 },
                            { header: 'Termék', key: 'name', width: 40 },
                            { header: 'Méret', key: 'size', width: 10 },
                            { header: 'Mennyiség', key: 'quantity', width: 15 },
                            { header: 'Egységár (Ft)', key: 'price', width: 20 },
                            { header: 'Összesen (Ft)', key: 'total', width: 20 }
                        ];

                        // Style Headers
                        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                        worksheet.getRow(1).fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF4A90E2' } // Blue header
                        };

                        // Rows
                        orderData.order_items.forEach((item: any) => {
                            worksheet.addRow({
                                sku: item.products?.sku || "-",
                                name: item.product_name || "-",
                                size: item.size || "-",
                                quantity: item.quantity || 0,
                                price: item.unit_price || 0,
                                total: (item.quantity || 0) * (item.unit_price || 0)
                            });
                        });

                        // Empty Row
                        worksheet.addRow({});

                        // Total Row
                        const totalRow = worksheet.addRow({
                            price: "VÉGÖSSZEG:",
                            total: orderData.total_amount || 0
                        });
                        totalRow.font = { bold: true, size: 12 };
                        totalRow.getCell('total').fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFEB3B' } // Yellow Highlight
                        };

                        // Generate Buffer
                        const buffer = await workbook.xlsx.writeBuffer();

                        // Convert to Base64 (using Standard Library)
                        // buffer from ExcelJS via writeBuffer is ArrayBuffer in browser/Deno context
                        const excelBase64 = base64Encode(new Uint8Array(buffer));

                        const fileName = `Rendeles_${orderData.order_number || orderData.id}.xlsx`;

                        attachments = [{
                            name: fileName,
                            content: excelBase64
                        }];

                    } catch (e) {
                        const errMsg = (e as any).message || String(e);
                        console.error("Excel generation error:", errMsg);

                    }
                } else {
                    console.error("No order data or DB error:", orderError);
                }
            } else {

            }
        } else {
            // Standard Logic
            switch (type) {
                case "new_order":
                    if (data.user_email) toEmail = data.user_email;
                    break;
                case "order_status":
                    if (data.user_email) toEmail = data.user_email;
                    break;
                case "new_ticket":
                    toEmail = adminEmail;
                    break;
                default:
                    toEmail = adminEmail;
            }
        }

        // Variable Replacement
        for (const [key, value] of Object.entries(data)) {
            const placeholder = new RegExp(`{{${key}}}`, "g");
            subject = subject.replace(placeholder, String(value));
            html = html.replace(placeholder, String(value));
        }

        console.log(`Sending email '${type}' to '${toEmail}' via Brevo`);

        const brevoPayload: any = {
            sender: {
                name: "Harps Global",
                email: "peter.bene.business@gmail.com"
            },
            to: [{ email: toEmail }],
            subject: subject,
            htmlContent: html,
        };

        if (attachments.length > 0) {
            brevoPayload.attachment = attachments;
        }

        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": BREVO_API_KEY,
                "content-type": "application/json",
            },
            body: JSON.stringify(brevoPayload),
        });

        const resData = await res.json();

        if (res.ok) {
            return new Response(JSON.stringify(resData), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        } else {
            console.error("Brevo Error:", resData);
            return new Response(JSON.stringify(resData), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

    } catch (error) {
        return new Response(JSON.stringify({
            error: (error as any).message
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
