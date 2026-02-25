# DNS Configuration for cognode.tech on Render

To connect your custom domain `cognode.tech` to your Render deployment, you need to configure the DNS settings with your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare).

## Steps to Configure DNS

1. **Deploy to Render:** First, ensure that your application is deployed on Render using the `render.yaml` configuration. Once deployed, Render will assign a default `onrender.com` URL to your service.

2. **Add Custom Domain in Render:**
   - Go to the Render Dashboard.
   - Select your Web Service (`cognode-web-dashboard`).
   - Navigate to the **Settings** tab.
   - Scroll down to the **Custom Domains** section.
   - Click **Add Custom Domain**.
   - Enter `cognode.tech` and save.
   - Repeat the process for `www.cognode.tech`.

3. **Configure DNS Records:**
   Render will provide you with specific DNS records to add to your registrar. Typically, this involves adding:
   - An **A Record** pointing to Render's IP addresses (usually multiple IPs provided in the dashboard).
   - Alternatively, a **CNAME Record** or **ALIAS Record** pointing the apex domain (`cognode.tech`) to the given `onrender.com` URL, depending on your DNS provider's capabilities.
   - A **CNAME Record** for the `www` subdomain pointing to your Render service URL (e.g., `cognode-web-dashboard.onrender.com`).

4. **Detailed Example (A & CNAME Records):**
   *(Note: The exact IP addresses and URLs will be provided in your Render dashboard)*
   | Type  | Name | Value |
   | ------------- | ------------- | ------------- |
   | A  | @ (or empty)  | `<Render IP 1>`  |
   | A  | @ (or empty)  | `<Render IP 2>`  |
   | CNAME  | www  | `cognode-web-dashboard.onrender.com.`  |

5. **Wait for Propagation:** DNS changes can take up to 48 hours to propagate fully, although it usually happens much faster. Once propagated, Render will automatically issue a free TLS certificate for your domain.

## Verifying Setup
After adding the records and waiting for propagation, visit `https://cognode.tech` and `https://www.cognode.tech` to ensure they route to your dashboard securely and correctly.
