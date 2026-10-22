# 🎓 Tutorial Lengkap dari Nol: Membangun Aplikasi FlowBoard dengan Next.js & Monday.com GraphQL API v2

Panduan ini dirancang khusus dari nol (**step-by-step**) agar Anda dapat memahami seluruh konsep, alur kerja, dan koding di balik integrasi **Monday.com API v2** menggunakan **GraphQL** dan **Next.js**.

---

## 📚 Daftar Isi
1. [Konsep Dasar: Apa itu Monday.com API & GraphQL?](#1-konsep-dasar-apa-itu-mondaycom-api--graphql)
2. [Langkah 1: Mendapatkan Kredensial Monday.com](#langkah-1-mendapatkan-kredensial-mondaycom)
3. [Langkah 2: Menyiapkan File Konfigurasi (.env.local)](#langkah-2-menyiapkan-file-konfigurasi-envlocal)
4. [Langkah 3: Memahami Struktur Data Task (lib/task.ts)](#langkah-3-memahami-struktur-data-task-libtaskts)
5. [Langkah 4: Menulis Query & Mutasi GraphQL (lib/graphql.ts)](#langkah-4-menulis-query--mutasi-graphql-libgraphqlts)
6. [Langkah 5: Membuat Jembatan Komunikasi API (lib/monday.ts)](#langkah-5-membuat-jembatan-komunikasi-api-libmondayts)
7. [Langkah 6: Membangun Backend API Route Next.js (app/api/monday/route.ts)](#langkah-6-membangun-backend-api-route-nextjs-appapimondayroutets)
8. [Langkah 7: Membangun Antarmuka Modern & Interaktif (app/page.tsx)](#langkah-7-membangun-antarmuka-modern--interaktif-apppagetsx)
9. [Langkah 8: Cara Menjalankan & Menguji Aplikasi](#langkah-8-cara-menjalankan--menguji-aplikasi)
10. [Rangkuman & Cheat Sheet GraphQL](#10-rangkuman--cheat-sheet-graphql)

---

## 1. Konsep Dasar: Apa itu Monday.com API & GraphQL?

### Perbedaan REST API vs GraphQL
Sebelum menulis kode, penting memahami mengapa Monday.com memilih **GraphQL**:

| Karakteristik | REST API Biasa | GraphQL (Monday.com API v2) |
|---|---|---|
| **Endpoint URL** | Banyak endpoint: `/boards`, `/items`, `/columns` | **Hanya 1 endpoint tunggal**: `POST https://api.monday.com/v2` |
| **Pengambilan Data** | Sering mengirim data berlebih (*over-fetching*) | **Klien menentukan sendiri** field apa saja yang diinginkan |
| **Permintaan Bertingkat** | Butuh beberapa kali request berantai (*waterfall*) | Bisa mengambil Board + Kolom + Item sekaligus dalam **1 request** |
| **Metode HTTP** | GET, POST, PUT, DELETE terpisah | Hampir selalu menggunakan **HTTP POST** dengan body JSON |

### Tiga Pilar GraphQL
1. **Query**: Digunakan untuk **membaca data** (mirip `GET` di REST API).
2. **Mutation**: Digunakan untuk **mengubah/menambah data** (mirip `POST`, `PATCH`, `DELETE` di REST API).
3. **Variables**: Nilai dinamis (seperti ID board, ID item) yang dikirimkan terpisah dari teks query untuk keamanan dan kemudahan penggunaan.

---

## Langkah 1: Mendapatkan Kredensial Monday.com

Untuk dapat berinteraksi dengan akun Anda, kita membutuhkan:
1. **Personal API Token** (Kunci rahasia untuk otentikasi)
2. **Board ID** (Nomor unik papan kerja yang ingin dibaca)

### A. Mengambil Personal API Token:
1. Buka [Monday.com](https://monday.com) dan login.
2. Klik **Avatar Profil** Anda di pojok kiri bawah.
3. Pilih menu **Developers**.
4. Klik tab **My Access Tokens**.
5. Klik tombol **Show**, lalu **Copy** token Anda (contoh token berawalan: `eyJhbGciOi...`).

### B. Menemukan Board ID:
1. Buka salah satu board kerja di Monday.com (misal board *My first project*).
2. Perhatikan address bar browser Anda:
   ```
   https://your-workspace.monday.com/boards/5031976216
   ```
3. Angka `5031976216` adalah **Board ID** Anda.

---

## Langkah 2: Menyiapkan File Konfigurasi (.env.local)

Simpan token rahasia di file `.env.local` di dalam folder `monday-app/`:

```env
# File: monday-app/.env.local
MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9...
MONDAY_BOARD_ID=5031976216
```

> 🔒 **Tips Keamanan:** File `.env.local` otomatis diabaikan oleh `.gitignore` sehingga tidak akan terunggah ke GitHub publik.

---

## Langkah 3: Memahami Struktur Data Task (`lib/task.ts`)

Aplikasi kita memerlukan tipe data TypeScript agar kode aman dari kesalahan ketik (*type-safety*).

Buka file [`lib/task.ts`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/lib/task.ts):

```typescript
// 1. Tipe status yang kita gunakan di aplikasi
export type TaskStatus = 'todo' | 'working' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

// 2. Bentuk objek Task
export interface Task {
  id: string | number;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  mondayId?: string;
}

// 3. Fungsi normalisasi: Mengubah teks label dari Monday.com ke format status aplikasi kita
export function normalizeMondayStatus(label?: string | null): TaskStatus {
  if (!label) return 'todo';
  const clean = label.toLowerCase().trim();
  if (clean.includes('done') || clean.includes('selesai')) return 'done';
  if (clean.includes('work') || clean.includes('progress') || clean.includes('sedang')) return 'working';
  return 'todo';
}

// 4. Mengubah status aplikasi kembali menjadi teks resmi Monday.com
export function toMondayStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'done': return 'Done';
    case 'working': return 'Working on it';
    default: return 'To Do';
  }
}
```

---

## Langkah 4: Menulis Query & Mutasi GraphQL (`lib/graphql.ts`)

Di file [`lib/graphql.ts`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/lib/graphql.ts), kita menuliskan sintaks GraphQL murni:

### 1. Membaca Item Board (Query)
```graphql
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
```
**Penjelasan:**
- `$boardId`: Parameter variabel bertipe array of ID `[ID!]`.
- `columns`: Mengambil daftar kolom (agar kita tahu mana kolom status, prioritas, dsb).
- `items_page(limit: 50)`: Mengambil 50 item teratas.
- `column_values`: Mengambil nilai teks dari setiap kolom di setiap item.

### 2. Membuat Task Baru (Mutation)
```graphql
mutation CreateTaskItem($boardId: ID!, $itemName: String!) {
  create_item(board_id: $boardId, item_name: $itemName) {
    id
    name
  }
}
```

### 3. Mengubah Status Task (Mutation)
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

---

## Langkah 5: Membuat Jembatan Komunikasi API (`lib/monday.ts`)

Buka file [`lib/monday.ts`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/lib/monday.ts). File ini bertugas mengeksekusi HTTP `fetch` ke Monday.com:

```typescript
export const MONDAY_API_URL = 'https://api.monday.com/v2';

export async function executeMondayGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  apiKey?: string
): Promise<T> {
  const token = apiKey || process.env.MONDAY_API_KEY;
  if (!token) throw new Error('API Key belum diisi.');

  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  // Tangani error bawaan GraphQL jika ada
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.map((e: any) => e.message).join(', '));
  }

  return result.data as T;
}
```

### Fungsi `fetchMondayBoard`:
Fungsi ini otomatis mencari kolom mana yang bertipe `status` (misal kolom `project_status` di board Anda), lalu memetakan item-item Monday.com ke list `Task[]` yang rapi.

---

## Langkah 6: Membangun Backend API Route Next.js (`app/api/monday/route.ts`)

Mengapa kita butuh API Route di Next.js?
1. **Menghindari Masalah CORS**: Browser memblokir panggilan langsung ke domain luar jika beda origin, namun server Next.js tidak memiliki batasan CORS tersebut.
2. **Keamanan API Key**: Kunci API disimpan aman di sisi server.

Buka file [`app/api/monday/route.ts`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/app/api/monday/route.ts):

* **`GET`**: Membaca data board Monday.com atau mengambil daftar semua board pengguna.
* **`POST (action: 'create')`**: Menambah item task baru via GraphQL.
* **`POST (action: 'run_graphql')`**: Menjalankan query kustom dari UI GraphQL Explorer.
* **`PATCH`**: Memperbarui status kolom task.
* **`DELETE`**: Menghapus item dari board.

---

## Langkah 7: Membangun Antarmuka Modern & Interaktif (`app/page.tsx`)

Buka file [`app/page.tsx`](file:///Users/herlambangk/FileKu/Bermain/monday/monday-app/app/page.tsx):

### Fitur yang Disediakan:
1. **Header Glassmorphism**: Menampilkan logo modern, status live board, dan tombol cepat.
2. **Kartu Metrik**: Menghitung otomatis task Total, To Do, Working, dan Done beserta persentase progress bar.
3. **Form Tambah Task Cepat**: Form input satu baris dengan pilihan prioritas dan status awal.
4. **Papan Kanban Kolom**:
   - Kolom **To Do** (Biru Sky `#579bfc`)
   - Kolom **Working on it** (Oranye/Amber `#fdab3d`)
   - Kolom **Done** (Hijau Emerald `#00c875`)
5. **Ubah Status 1-Klik (*Optimistic UI*)**: Saat Anda mengklik status task, UI langsung berpindah seketika tanpa jeda, sementara mutasi GraphQL dijalankan di latar belakang.
6. **GraphQL Explorer**: Panel bawaan di mana Anda dapat melihat query GraphQL asli, mengubah parameternya, dan mengklik **"Jalankan Query"** untuk melihat response JSON langsung dari server Monday.com!

---

## Langkah 8: Cara Menjalankan & Menguji Aplikasi

1. **Buka terminal dan masuk ke folder proyek:**
   ```bash
   cd /Users/herlambangk/FileKu/Bermain/monday/monday-app
   ```

2. **Jalankan development server:**
   ```bash
   npm run dev
   ```

3. **Buka di Browser:**
   Akses **[http://localhost:3000](http://localhost:3000)**.

4. **Uji Coba Sinkronisasi:**
   * Lihat task **Belajar Fundamental**, **Task 2**, dan **Task 3** yang dibaca dari board Monday.com Anda.
   * Coba klik tombol status pada task *Belajar Fundamental* untuk memindahkannya ke *Done*.
   * Buka dashboard Monday.com di tab browser lain, refresh, dan perhatikan statusnya langsung berubah di Monday.com!

---

## 10. Rangkuman & Cheat Sheet GraphQL

### Cara Menulis Query di GraphQL
```graphql
query NamaOperasi($variabel: TipeData) {
  namaField(argumen: $variabel) {
    propertiYangInginDiambil
  }
}
```

### Cara Menulis Mutasi di GraphQL
```graphql
mutation NamaOperasi($variabel: TipeData) {
  namaMutasi(argumen: $variabel) {
    hasilKembalian
  }
}
```

### Tips Sukses Menggunakan Monday.com API:
* **Gunakan `API-Version: 2024-01`** pada header HTTP agar selalu menggunakan skema terbaru.
* **Gunakan GraphQL Explorer** di navbar aplikasi Anda untuk bereksperimen dengan query baru sebelum mengintegrasikannya ke kode.
* **Gunakan kolom ID dinamis** (`col.type === 'status'`) karena setiap board di Monday.com bisa menamai kolom statusnya secara unik (seperti `project_status` pada board Anda).

---

*Selamat belajar dan mengembangkan aplikasi integrasi Monday.com!* 🚀
