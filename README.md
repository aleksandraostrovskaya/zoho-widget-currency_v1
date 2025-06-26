# 💱 Zoho CRM Currency Rate Widget

A custom widget for the **Deals** module in Zoho CRM that displays the current NBU exchange rate, the deal rate from CRM, the percentage difference, and allows updating the deal rate when the difference exceeds a threshold.

---

## 🔧 Features

- Fetches USD exchange rate from NBU API
- Compares it with the rate in the CRM deal
- Shows percentage difference between rates
- Shows **"Update Deal Rate"** button if difference ≥ 5%
- Multi-language support (Ukrainian and English) via `lang.json`
- Stores the last known NBU rate in `localStorage`
- User action logging to console
- Disables button during update with spinner/text
- Responsive UI with **Bootstrap**
- Mobile-friendly layout

---

## 🚀 How to Use

### 1. Deploy the widget

Host the project using:
- [Netlify](https://netlify.com)
- [Vercel](https://vercel.com)
- Any static hosting service

### 2. Register the widget in Zoho CRM

1. Go to **Settings → Developer Hub → Widgets → Create New Widget**
2. Name: `Currency Rate Widget`
3. Type: **Related List**
4. Hosting: **External**
5. URL: Paste your deployed site URL
7. Click **Create**

---

