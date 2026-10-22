# 📘 Tutorial Lengkap Integrasi Monday.com dengan GraphQL API v2

Selamat datang di panduan komprehensif integrasi **Monday.com** menggunakan **GraphQL API v2** di aplikasi **FlowBoard (Next.js & TypeScript)**.

Dokumen ini ditulis secara runtut dan sederhana agar siapa pun—baik pemula maupun developer berpengalaman—dapat memahami cara kerja GraphQL, cara membaca data dari akun Monday.com Anda, serta penjelasan detail dari setiap baris koding yang digunakan.

---

## 📑 Daftar Isi
1. [Pengenalan GraphQL & Monday.com API v2](#1-pengenalan-graphql--mondaycom-api-v2)
2. [Cara Menghubungkan & Membaca Data Monday.com Anda](#2-cara-menghubungkan--membaca-data-mondaycom-anda)
3. [Arsitektur Aplikasi & Alur Data](#3-arsitektur-aplikasi--alur-data)
4. [Penjelasan Koding File per File](#4-penjelasan-koding-file-per-file)
   - [lib/graphql.ts (Pusat Query & Mutasi GraphQL)](#libgraphqlts)
   - [lib/task.ts (Model Data & Normalisasi Status)](#libtaskts)
   - [lib/monday.ts (GraphQL Client & Helper)](#libmondayts)
   - [app/api/monday/route.ts (Backend API Route Next.js)](#appapimondayroutets)
   - [app/page.tsx (Antarmuka Kanban & GraphQL Explorer)](#apppagetsx)
5. [Bedah Sintaks GraphQL (Query & Mutation)](#5-bedah-sintaks-graphql-query--mutation)
6. [Fitur GraphQL Explorer di Aplikasi](#6-fitur-graphql-explorer-di-aplikasi)
7. [Penanganan Error & Best Practices](#7-penanganan-error--best-practices)

---

## 1. Pengenalan GraphQL & Monday.com API v2

### Mengapa Monday.com Menggunakan GraphQL?
Pada REST API konvensional, jika Anda ingin mengambil data board beserta seluruh item dan kolomnya, Anda mungkin harus memanggil beberapa endpoint sekaligus:
- `GET /api/v1/boards/123` (mendapatkan nama board)
- `GET /api/v1/boards/123/columns` (mendapatkan kolom status)
- `GET /api/v1/boards/123/items` (mendapatkan daftar item)

Dengan **GraphQL**:
1. **Satu Endpoint Tunggal**: Semua permintaan dikirim ke satu URL saja:
   ```
   POST https://api.monday.com/v2
   ```
2. **Bebas Over-fetching & Under-fetching**: Klien meminta **hanya data yang dibutuhkan**. Jika hanya butuh `id` dan `name`, server hanya mengembalikan kedua field tersebut.
3. **Struktur Data Terprediksi**: Bentuk response JSON dari server persis menyerupai bentuk query yang dikirimkan oleh klien.

### Format Standar Header Monday.com:
```http
POST /v2 HTTP/1.1
Host: api.monday.com
Authorization: eyJhbGciOi... (Personal Token Anda)
Content-Type: application/json
API-Version: 2024-01
```

---

## 2. Cara Menghubungkan & Membaca Data Monday.com Anda

Untuk membaca board dan task asli dari akun Anda:

### Langkah 1: Ambil Personal API Token
1. Buka [Monday.com](https://monday.com) dan login ke workspace Anda.
2. Klik **Avatar Profil** Anda di pojok kiri bawah layar.
3. Pilih menu **Developers**.
4. Klik tab **My Access Tokens**.
5. Klik **Show** lalu **Copy** Personal API Token Anda.

### Langkah 2: Memilih Board Kerja
Ada dua cara mudah untuk memilih board:
* **Cara Otomatis**: Masukkan Personal Token Anda di menu **⚙️ Koneksi Monday** pada aplikasi FlowBoard, lalu klik **Uji Koneksi & Tarik Daftar Board**. Aplikasi akan otomatis mendeteksi semua board Anda dan menampilkannya dalam dropdown!
* **Cara Manual**: Buka board di browser Anda, perhatikan URL di address bar:
  `https://your-team.monday.com/boards/1234567890`
  Angka `1234567890` adalah **Board ID** Anda.

### Langkah 3: Konfigurasi via UI atau `.env.local`
* **Melalui UI**: Klik tombol **⚙️ Koneksi Monday** di navbar atas, tempel API Key dan pilih board, lalu klik **Simpan & Baca Data**.
* **Melalui File Konfigurasi**: Buat file `.env.local` di folder proyek:
  ```env
  MONDAY_API_KEY=eyJhbGciOi...
  MONDAY_BOARD_ID=1234567890
  ```

---

## 3. Arsitektur Aplikasi & Alur Data

Berikut diagram alur komunikasi data antara Browser, Server Next.js, dan Monday.com:

```
[ Browser Klien (React UI) ]
            │
            ▼  1. Mengirim fetch('/api/monday')
[ Next.js API Route (/api/monday/route.ts) ]
            │  (Menjaga API Key tetap aman di server)
            ▼  2. Mengirim GraphQL Query/Mutation via POST
[ Monday.com GraphQL Endpoint (https://api.monday.com/v2) ]
            │
            ▼  3. Mengembalikan Data JSON { data: { boards: [...] } }
[ Next.js API Route ]
            │  4. Memetakan item ke format Task sederhana
            ▼
[ Browser Klien (React UI) ]
   (Menampilkan Kanban Board: To Do, Working on it, Done)
```

---

## 4. Penjelasan Koding File per File

### `lib/graphql.ts`
File ini adalah pustaka terpusat untuk semua string query dan mutation GraphQL:

```typescript
// 1. Query profil pengguna aktif
export const QUERY_ME = `
query GetCurrentUser {
  me {
    id
    name
    email
  }
}
`;

// 2. Query membaca seluruh item dan kolom board
export const QUERY_GET_BOARD_ITEMS = `
query GetBoardItems($boardId: [ID!]) {
  boards(ids: $boardId) {
    id
    name
    columns {
      id
      title
      type
    }
    items_page(limit: 50) {
      items {
        id
        name
        column_values {
          id
          type
          text
          value
        }
      }
    }
  }
}
`;

// 3. Mutasi membuat task baru
export const MUTATION_CREATE_ITEM = `
mutation CreateTaskItem($boardId: ID!, $itemName: String!) {
  create_item(board_id: $boardId, item_name: $itemName) {
    id
    name
  }
}
`;

// 4. Mutasi mengubah nilai status
export const MUTATION_UPDATE_STATUS = `
mutation UpdateTaskStatus($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
  change_simple_column_value(
    board_id: $boardId,
    item_id: $itemId,
    column_id: $columnId,
    value: $value
  ) {
    id
  }
}
`;
```

---

### `lib/task.ts`
File ini mendefinisikan tipe data lokal aplikasi dan fungsi normalisasi label status:
- **`TaskStatus`**: `'todo' | 'working' | 'done'`
- **`normalizeMondayStatus(label)`**: Mengubah teks bebas Monday.com (misal "Done", "Working on it", "In Progress", "Selesai") ke format standar `TaskStatus`.
- **`toMondayStatusLabel(status)`**: Mengembalikan label teks yang tepat untuk dikirimkan kembali ke kolom Monday.com.

---

### `lib/monday.ts`
File ini berisi fungsi jembatan komunikasi GraphQL:
1. **`executeMondayGraphQL(query, variables, apiKey)`**:
   - Memvalidasi token.
   - Melakukan HTTP `fetch` dengan method `POST` ke `https://api.monday.com/v2`.
   - Menangkap jika Monday.com mengembalikan error GraphQL (`result.errors`).
2. **`fetchUserBoards(apiKey)`**:
   - Mengambil daftar semua papan kerja aktif milik pengguna.
3. **`fetchMondayBoard(boardId, apiKey)`**:
   - Menjalankan `QUERY_GET_BOARD_ITEMS`.
   - Mengidentifikasi secara otomatis kolom mana yang bertipe `status`.
   - Mengubah list item Monday.com menjadi array `Task[]`.
4. **`createMondayItem(...)`**:
   - Menjalankan mutasi `create_item`.
   - Jika berhasil, menyelaraskan label status awal task tersebut.
5. **`updateMondayItemStatus(...)`**:
   - Mengubah status task menggunakan mutasi `change_simple_column_value`.
6. **`deleteMondayItem(...)`**:
   - Menghapus item dari board menggunakan mutasi `delete_item`.

---

### `app/api/monday/route.ts`
File ini adalah backend API Route Next.js. Mengapa kita butuh file ini?
1. **Keamanan (Security)**: API Key tidak terekspos langsung di browser pengguna jika disimpan di server environment (`process.env.MONDAY_API_KEY`).
2. **Menghindari Masalah CORS**: Panggilan dari server ke `api.monday.com` tidak dibatasi kebijakan cross-origin browser.

Endpoint ini melayani:
- **`GET`**: Membaca data board dan item, atau mengambil daftar board (`?action=boards`).
- **`POST action="create"`**: Membuat task baru.
- **`POST action="test"`**: Menguji validitas token pengguna.
- **`POST action="run_graphql"`**: Menjalankan query kustom dari GraphQL Explorer.
- **`PATCH`**: Memperbarui status kolom task.
- **`DELETE`**: Menghapus task dari board.

---

### `app/page.tsx`
Antarmuka pengguna (Frontend React Client Component):
- **Statistik & Metrik**: Menghitung secara otomatis jumlah task total, to do, in progress, dan selesai.
- **Kanban Board**: Mengelompokkan kartu task ke dalam 3 kolom (*To Do*, *Working on it*, *Done*).
- **Optimistic UI Updates**: Saat Anda mengklik status task, UI langsung berpindah seketika tanpa menunggu respon jaringan, dan jika terjadi kegagalan jaringan, status otomatis dikembalikan (*rollback*).
- **GraphQL Explorer**: Panel interaktif untuk melihat dan menguji query GraphQL langsung dari browser.

---

## 5. Bedah Sintaks GraphQL (Query & Mutation)

Mari kita bedah sintaks GraphQL yang digunakan:

### A. Membaca Data Board (Query)
```graphql
query GetBoardItems($boardId: [ID!]) {
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
* **`query GetBoardItems($boardId: [ID!])`**: Mendeklarasikan operasi bertipe `query` bernama `GetBoardItems` yang menerima variabel `$boardId` bertipe array of ID (`[ID!]`).
* **`boards(ids: $boardId)`**: Meminta data papan dengan ID tertentu.
* **`items_page(limit: 50)`**: Mengambil halaman item (maksimal 50 item).
* **`column_values { id text }`**: Mengambil nilai teks dari setiap kolom di baris item tersebut.

---

### B. Membuat Item Baru (Mutation)
```graphql
mutation CreateTaskItem($boardId: ID!, $itemName: String!) {
  create_item(board_id: $boardId, item_name: $itemName) {
    id
    name
  }
}
```
* **`mutation`**: Operasi yang mengubah data di server (menulis data baru).
* **`create_item(...)`**: Fungsi mutasi bawaan Monday.com untuk menambahkan baris baru.
* **`{ id name }`**: Nilai balik (payload) yang kita minta setelah item berhasil dibuat.

---

### C. Mengubah Status Kolom (Mutation)
```graphql
mutation UpdateTaskStatus($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
  change_simple_column_value(
    board_id: $boardId,
    item_id: $itemId,
    column_id: $columnId,
    value: $value
  ) {
    id
  }
}
```
* **`change_simple_column_value`**: Mutasi Monday.com paling sederhana untuk mengupdate nilai teks kolom seperti label status tanpa perlu serialisasi JSON yang rumit.

---

## 6. Fitur GraphQL Explorer di Aplikasi

Aplikasi FlowBoard dilengkapi dengan **GraphQL Explorer** interaktif:
1. Buka aplikasi di [http://localhost:3000](http://localhost:3000).
2. Klik tombol **GraphQL Explorer** di navbar atas.
3. Anda dapat memilih preset query:
   - `1. Cek Profil Akun (me)`
   - `2. Daftar Papan Kerja (boards)`
   - `3. Baca Item Board (items_page)`
   - `4. Buat Task Baru (create_item)`
4. Klik tombol hijau **Jalankan Query**.
5. Anda akan langsung melihat respon JSON asli dari server Monday.com di layar!

---

## 7. Penanganan Error & Best Practices

1. **Format Error GraphQL**:
   Jika token salah atau ID board tidak ditemukan, Monday.com mengembalikan status HTTP 200 namun dengan array `errors`:
   ```json
   {
     "errors": [
       { "message": "Not Authenticated" }
     ]
   }
   ```
   Fungsi `executeMondayGraphQL` di `lib/monday.ts` secara otomatis mengecek properti `result.errors` dan melempar pesan error yang ramah pengguna.

2. **Deteksi Kolom Dinamis**:
   Setiap board di Monday.com bisa memiliki nama dan ID kolom yang berbeda-beda. Kode di `lib/monday.ts` menggunakan pengecekan dinamis:
   ```typescript
   const statusColumn = board.columns.find(
     (col) => col.type === 'status' || col.id === 'status' || col.title.toLowerCase().includes('status')
   );
   ```
   Hal ini menjamin aplikasi dapat membaca board apa pun tanpa konfigurasi manual!

3. **Fallback Mode Demo**:
   Bila API key belum diisi, aplikasi tidak akan crash melainkan otomatis menyajikan mode demo agar alur kerja tetap bisa dipelajari secara visual.

---

*Selamat mengeksplorasi integrasi Monday.com dan GraphQL!*

