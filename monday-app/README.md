# FlowBoard 🚀 - Monday.com Task Management

Aplikasi manajemen task yang **simpel dipahami**, responsif, dan terintegrasi langsung dengan **Monday.com API v2 (GraphQL)**.

---

## ✨ Fitur Utama

1. **Simpel & Mudah Dipahami**:
   - Tampilan rapi dengan metrik status (*Total Task*, *To Do*, *Working on it*, *Done*).
   - Dua mode tampilan: **Kanban Kolom** dan **Daftar (List)**.
   - Ubah status task secara cepat hanya dengan **1-klik** (To Do ➔ Working on it ➔ Done).

2. **Dua Mode Operasi**:
   - **Mode Demo (Simulasi)**: Langsung dapat digunakan tanpa perlu API Key, ideal untuk melihat alur kerja terlebih dahulu.
   - **Mode Live (Monday.com)**: Terhubung langsung secara real-time ke akun dan board Monday.com Anda.

3. **Integrasi Penuh Monday.com API v2 (GraphQL)**:
   - Mengambil item dari Board Monday.com (`query { boards { items_page { items ... } } }`).
   - Membuat task baru langsung masuk ke Monday.com (`mutation { create_item ... }`).
   - Memperbarui status kolom (`mutation { change_simple_column_value ... }`).
   - Menghapus task (`mutation { delete_item ... }`).

---

## 🚀 Cara Menjalankan Aplikasi

1. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```

2. **Buka di Browser**:
   Kunjungi [http://localhost:3000](http://localhost:3000).

---

## 🔗 Panduan Integrasi Monday.com

Anda bisa menghubungkan Monday.com melalui **UI Aplikasi** (tombol *Koneksi Monday*) atau melalui file **`.env.local`**.

### 1. Dapatkan Personal API Token:
- Buka akun [Monday.com](https://monday.com).
- Klik avatar foto profil Anda di pojok kiri bawah.
- Pilih menu **Developers**.
- Buka tab **My Access Tokens**, lalu salin Personal API Token Anda.

### 2. Dapatkan Board ID:
- Buka board kerja Anda di Monday.com.
- Perhatikan URL di address bar browser:
  ```
  https://workspace.monday.com/boards/1234567890
  ```
  Angka `1234567890` adalah **Board ID** Anda.

### 3. Konfigurasi Kredensial:
Buat file `.env.local` di root proyek:
```bash
cp .env.example .env.local
```
Lalu isi kredensial Anda:
```env
MONDAY_API_KEY=eyJhbGciOi...
MONDAY_BOARD_ID=1234567890
```
> Atau langsung klik tombol **⚙️ Koneksi Monday** di pojok kanan atas aplikasi untuk menguji dan menyimpan token tanpa perlu restart server!

---

## 📂 Struktur File & Penjelasan Kode

```
├── app/
│   ├── api/monday/route.ts  # Endpoint API Server Next.js yang memanggil GraphQL Monday.com
│   ├── page.tsx             # Antarmuka (UI) interaktif FlowBoard (Kanban + List)
│   └── globals.css          # Styling Tailwind CSS
├── lib/
│   ├── monday.ts            # Logika integrasi GraphQL Monday.com (Query & Mutasi)
│   ├── task.ts              # Interface Task dan pemetaan label status
│   └── utils.ts             # Helper classname (cn)
├── .env.example             # Contoh template variabel lingkungan
└── README.md                # Dokumentasi panduan
```

---

## 💡 Contoh Query GraphQL Monday.com yang Digunakan

### Mengambil Data Board & Items:
```graphql
query GetBoardData($boardId: [ID!]) {
  boards(ids: $boardId) {
    id
    name
    items_page(limit: 50) {
      items {
        id
        name
        column_values {
          id
          text
        }
      }
    }
  }
}
```

### Membuat Item Baru:
```graphql
mutation CreateItem($boardId: ID!, $itemName: String!) {
  create_item(board_id: $boardId, item_name: $itemName) {
    id
    name
  }
}
```
