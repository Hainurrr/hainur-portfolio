import beasiswaImg from "../assets/images/beasiswa-kukar.webp";
import fraudImg from "../assets/images/fraud-dashboard.webp";
import pokedataImg from "../assets/images/pokedata.webp";
import portraitAcademicImg from "../assets/images/portrait-academic.webp";
import portraitRevealImg from "../assets/images/portrait-reveal.webp";
import telyucanAdminSample from "../assets/images/samples/telyucan-admin.webp";
import telyucanHomeSample from "../assets/images/samples/telyucan-home.webp";
import telyucanMenuSample from "../assets/images/samples/telyucan-menu.webp";
import telyucanTenantSample from "../assets/images/samples/telyucan-tenant.webp";
import telyujiAdminSample from "../assets/images/samples/telyuji-admin.webp";
import telyujiLaboranSample from "../assets/images/samples/telyuji-laboran.webp";
import telyujiLandingSample from "../assets/images/samples/telyuji-landing.webp";
import telyujiPemohonSample from "../assets/images/samples/telyuji-pemohon.webp";

export type Locale = "id" | "en";

export type LocalizedText = { id: string; en: string };

export type DomainCategory = "Web Dev" | "Data Analytics" | "Info Systems";

export const SKILL_ROLES: readonly LocalizedText[] = [
  { id: "Web Development", en: "Web Development" },
  { id: "Frontend", en: "Frontend" },
  { id: "Data Analytics", en: "Data Analytics" },
  { id: "Cloud & AI", en: "Cloud & AI" },
  { id: "Design & Prototyping", en: "Design & Prototyping" },
  { id: "Sistem Informasi", en: "Information Systems" },
];

export type ProjectSamplePage = {
  src: string;
  width: number;
  height: number;
  title: LocalizedText;
  alt: LocalizedText;
};

export type ProjectDemoVideo = {
  webm: string;
  mp4: string;
  poster: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  shortName: string;
  url: string;
  categories: DomainCategory[];
  role: LocalizedText;
  shortTag: LocalizedText;
  teamCredit?: LocalizedText;
  isContributor?: boolean;
  contributorNote?: LocalizedText;
  /** Real verified screenshot asset (null only for Nusantara Atlas where no local screenshot exists) */
  screenshot: { src: string; width: number; height: number; alt: LocalizedText } | null;
  /** Optional real live demo walkthrough video shown in the dossier modal */
  demoVideo?: ProjectDemoVideo;
  /** Optional real sample page screenshots shown below the demo video */
  samplePages?: ProjectSamplePage[];
  /** Verified primary metric shown on card footer */
  metricValue: number | null;
  metricDisplay: LocalizedText;
  metricLabel: LocalizedText;
  /** Real Cassiopeia star mapping on the 3D Solar Eclipse Celestial Globe */
  starGreek: string;
  starName: string;
  coordLabel: string;
  lat: number;
  lon: number;
  summary: LocalizedText;
  impactLine: LocalizedText;
  highlights: { id: string[]; en: string[] };
  stack: string[];
};

export const t = (text: LocalizedText, lang: Locale): string => text[lang];

export const PROFILE = {
  firstName: "Hainur",
  lastName: "Fadillah",
  fullName: "Hainur Fadillah",
  location: "Bandung · Kutai Kartanegara, Kaltim",
  links: {
    whatsapp: "https://wa.me/6281348508082",
    linkedin: "https://www.linkedin.com/in/hainur-fadillah-8081521ba/",
    github: "https://github.com/Hainurrr",
    scholarship: "https://bis.telkomuniversity.ac.id/beasiswa-kukar-idaman/",
  },
  scholarshipMedia: {
    src: beasiswaImg,
    width: 1440,
    height: 736,
    alt: {
      id: "Halaman resmi S1 Sistem Informasi Telkom University menampilkan Hainur Fadillah sebagai penerima Beasiswa Kukar Idaman",
      en: "Official Telkom University Information Systems page featuring Hainur Fadillah as a Beasiswa Kukar Idaman awardee",
    },
  },
  photos: {
    academic: {
      src: portraitAcademicImg,
      revealSrc: portraitRevealImg,
      width: 720,
      height: 920,
      alt: {
        id: "Potret Hainur Fadillah mengenakan jas almamater marun Telkom University",
        en: "Portrait of Hainur Fadillah wearing Telkom University maroon almamater blazer",
      },
    },
  },
};

export const UI_COPY = {
  skipToMain: { id: "Lewati ke konten utama", en: "Skip to main content" },
  opensNewTab: { id: "(buka di tab baru)", en: "(opens in a new tab)" },
  heroPrimaryCta: { id: "Lihat 5 Karya", en: "Explore 5 Works" },
  heroSecondaryCta: { id: "LinkedIn", en: "LinkedIn" },
  globeHintDesktop: {
    id: "Seret untuk memutar · klik bintang untuk detail",
    en: "Drag to rotate · click any star for details",
  },
  globeHintTouch: {
    id: "Geser planet untuk memutar · geser luar planet untuk scroll",
    en: "Drag planet to spin · swipe outside to scroll",
  },
  globeDetails: { id: "Lihat Detail", en: "View Details" },
  globeLaunch: { id: "Buka Live", en: "Open Live" },
  globeCloseDetail: { id: "Tutup detail bintang", en: "Close star details" },
  projectsHeading: {
    id: "Karya & Kontribusi",
    en: "Works & Contributions",
  },
  filterAll: { id: "Semua (5)", en: "All (5)" },
  filterWeb: { id: "Web Dev", en: "Web Dev" },
  filterAnalytics: { id: "Data Analytics", en: "Data Analytics" },
  filterIS: { id: "Sistem Informasi", en: "Info Systems" },
  cardLaunchBuilt: { id: "Buka Aplikasi", en: "Launch App" },
  cardLaunchPlatform: { id: "Kunjungi Situs", en: "Visit Site" },
  lightboxClose: { id: "Tutup pratinjau", en: "Close preview" },
  profileHeading: {
    id: "Tentang Saya",
    en: "About Me",
  },
  profileBio: {
    id: "Mahasiswa S1 Sistem Informasi Telkom University yang fokus pada Web Development, Frontend, Data Analytics, Cloud & AI, serta Design & Prototyping, sekaligus menyalurkan laporan lapangan warga Kalimantan Timur untuk keterbukaan data lingkungan.",
    en: "Telkom University Information Systems student focusing on Web Development, Frontend, Data Analytics, Cloud & AI, and Design & Prototyping, while bridging East Kalimantan field reports into open environmental data.",
  },
  scholarshipTitle: { id: "Penerima Beasiswa Kukar Idaman", en: "Beasiswa Kukar Idaman Awardee" },
  scholarshipCta: { id: "Buka Halaman", en: "Open Page" },
  contactHeading: {
    id: "Terbuka untuk kolaborasi & peluang baru.",
    en: "Open for collaborations & opportunities.",
  },
  contactNote: {
    id: "Hubungi langsung via WhatsApp, LinkedIn, atau lihat kode di GitHub.",
    en: "Reach out directly via WhatsApp, LinkedIn, or browse code on GitHub.",
  },
  contactWhatsAppSub: { id: "Chat langsung & respons cepat", en: "Direct chat & quick response" },
  contactLinkedInSub: { id: "Rekrutmen, magang & kolaborasi", en: "Internships, hiring & collaboration" },
  contactGitHubSub: { id: "Kode sumber & proyek publik", en: "Source code & public projects" },
} as const;

export const PROJECTS: ProjectRecord[] = [
  {
    id: "telyucan",
    name: "TelyuCan",
    shortName: "TelyuCan",
    url: "https://telyucan.app/",
    categories: ["Web Dev", "Info Systems"],
    role: { id: "Full-Stack Web Dev & Project Manager", en: "Full-Stack Web Dev & Project Manager" },
    teamCredit: {
      id: "Kelompok 5 · S1 SI Telkom University (Web Application Development)",
      en: "Kelompok 5 · Telkom University IS (Web Application Development)",
    },
    shortTag: { id: "Kantin Kampus", en: "Campus Canteen" },
    screenshot: {
      src: telyucanHomeSample,
      width: 1280,
      height: 720,
      alt: {
        id: "Tangkapan layar TelyuCan, web pemesanan makanan kantin Telkom University tanpa antri",
        en: "Screenshot of TelyuCan, Telkom University cashless campus canteen web app",
      },
    },
    demoVideo: {
      webm: "/demos/telyucan-demo.webm",
      mp4: "/demos/telyucan-demo.mp4",
      poster: telyucanHomeSample,
    },
    samplePages: [
      {
        src: telyucanHomeSample,
        width: 1280,
        height: 720,
        title: { id: "Beranda & Zona Kantin", en: "Home & Canteen Zones" },
        alt: {
          id: "Halaman beranda TelyuCan menampilkan area kantin TULT, GKU, dan Pujasera",
          en: "TelyuCan home page showcasing TULT, GKU, and Pujasera canteen zones",
        },
      },
      {
        src: telyucanMenuSample,
        width: 1280,
        height: 720,
        title: { id: "Katalog Menu & Stok Real-Time", en: "Menu Catalog & Live Stock" },
        alt: {
          id: "Halaman katalog menu TelyuCan dengan filter kategori, lokasi kantin, dan stok harian",
          en: "TelyuCan menu catalog with category filters, canteen location, and live daily stock",
        },
      },
      {
        src: telyucanTenantSample,
        width: 1280,
        height: 720,
        title: { id: "Layar Dapur Tenant (KDS)", en: "Tenant Kitchen Display (KDS)" },
        alt: {
          id: "Layar Dapur (Kitchen Display System) TelyuCan untuk memantau pesanan masuk dan status gerai",
          en: "TelyuCan tenant Kitchen Display System for tracking paid orders and stall status",
        },
      },
      {
        src: telyucanAdminSample,
        width: 1280,
        height: 720,
        title: { id: "Dasbor Admin & Manajemen Gerai", en: "Admin Dashboard & Tenants" },
        alt: {
          id: "Dasbor admin TelyuCan untuk manajemen tenant, pengguna, dan moderasi ulasan",
          en: "TelyuCan admin dashboard for tenant management, users, and review moderation",
        },
      },
    ],
    metricValue: 3,
    metricDisplay: { id: "3 Zona Kantin", en: "3 Canteen Zones" },
    metricLabel: {
      id: "TULT, GKU & Pujasera · Midtrans",
      en: "TULT, GKU & Pujasera · Midtrans",
    },
    starGreek: "β",
    starName: "Caph",
    coordLabel: "CASSIOPEIA · β Cas (Caph) · 00h09m +59°",
    lat: 21,
    lon: 74,
    summary: {
      id: "Web pemesanan kantin kampus Telkom University berbasis Laravel 11 dengan keranjang multi-tenant, pembayaran Midtrans Snap, dan Layar Dapur tenant.",
      en: "Laravel 11 Telkom University campus canteen app featuring multi-tenant cart checkout via Midtrans Snap and a live tenant Kitchen Display System.",
    },
    impactLine: {
      id: "Pesan makanan kantin Tel-U lintas gerai tanpa antri dengan pembayaran non-tunai.",
      en: "Multi-stall Tel-U canteen ordering with live stock and cashless checkout.",
    },
    highlights: {
      id: [
        "Keranjang multi-tenant lintas gerai (TULT, GKU, Pujasera) dengan pembayaran Midtrans Snap (QRIS, GoPay, E-Wallet, VA)",
        "Layar Dapur (Kitchen Display System), manajemen stok harian, serta dasbor admin & ekspor PDF/CSV",
      ],
      en: [
        "Multi-tenant cart across TULT, GKU, and Pujasera stalls with Midtrans Snap digital checkout",
        "Real-time tenant Kitchen Display System, daily stock management, and admin PDF/CSV reporting",
      ],
    },
    stack: ["Laravel 11", "PHP 8.2", "Bootstrap 5.3", "Midtrans Snap", "Cloudinary", "MySQL"],
  },
  {
    id: "telyuji",
    name: "Telyuji",
    shortName: "Telyuji",
    url: "https://telyuji-02704c185fa1.herokuapp.com/",
    categories: ["Info Systems", "Web Dev"],
    role: { id: "Full-Stack Web Dev & Project Manager", en: "Full-Stack Web Dev & Project Manager" },
    shortTag: { id: "Pengujian Lab", en: "Lab Testing IS" },
    screenshot: {
      src: telyujiLandingSample,
      width: 1280,
      height: 720,
      alt: {
        id: "Tangkapan layar Telyuji, portal pengujian laboratorium Telkom University",
        en: "Screenshot of Telyuji, Telkom University laboratory testing portal",
      },
    },
    demoVideo: {
      webm: "/demos/telyuji-demo.webm",
      mp4: "/demos/telyuji-demo.mp4",
      poster: telyujiLandingSample,
    },
    samplePages: [
      {
        src: telyujiLandingSample,
        width: 1280,
        height: 720,
        title: { id: "Halaman Utama & Pelacakan Kode Uji", en: "Landing & Sample Tracking" },
        alt: {
          id: "Halaman utama Telyuji dengan layanan pengujian lab terpadu dan pelacakan kode TU-LAB-2026-0042",
          en: "Telyuji landing page with integrated lab testing portal and TU-LAB-2026-0042 code tracker",
        },
      },
      {
        src: telyujiPemohonSample,
        width: 1280,
        height: 720,
        title: { id: "Dasbor Pemohon & Linimasa Uji", en: "Applicant Dashboard & Timeline" },
        alt: {
          id: "Dasbor pemohon Telyuji menampilkan total pengajuan, status sedang diuji, dan daftar sampel terkini",
          en: "Telyuji applicant dashboard showing submitted requests, active lab tests, and sample timeline",
        },
      },
      {
        src: telyujiLaboranSample,
        width: 1280,
        height: 720,
        title: { id: "Portal Laboran & Unggah LHU Terenkripsi", en: "Technician Portal & Encrypted LHU" },
        alt: {
          id: "Halaman Unggah dan Revisi Hasil Uji Telyuji milik laboran untuk antrean tiket dan dokumen LHU terenkripsi",
          en: "Telyuji lab technician LHU upload and revision page managing ticket queues and encrypted reports",
        },
      },
      {
        src: telyujiAdminSample,
        width: 1280,
        height: 720,
        title: { id: "Dasbor Analitik Admin & Utilitas Mesin", en: "Admin Analytics & Lab Machines" },
        alt: {
          id: "Dasbor analitik admin Telyuji menampilkan grafik penggunaan mesin lab dan distribusi pengajuan per fakultas",
          en: "Telyuji admin analytics dashboard showing lab instrument utilization and faculty submission charts",
        },
      },
    ],
    metricValue: null,
    metricDisplay: { id: "Tracking + LHU", en: "Tracking + LHU" },
    metricLabel: {
      id: "AES-256-CBC · 3 Peran Akses",
      en: "AES-256-CBC · 3 Access Roles",
    },
    starGreek: "α",
    starName: "Schedar",
    coordLabel: "CASSIOPEIA · α Cas (Schedar) · 00h40m +56°",
    lat: -21,
    lon: 93,
    summary: {
      id: "Sistem informasi manajemen layanan pengujian laboratorium terintegrasi Telkom University dari pengajuan sampel, E-Ticket barcode, hingga unduh LHU terenkripsi AES-256-CBC.",
      en: "Integrated Telkom University laboratory testing management system from digital sample requests and barcode E-Tickets to AES-256-CBC encrypted LHU downloads.",
    },
    impactLine: {
      id: "Pengajuan sampel digital, pelacakan kode uji lab, dan penerbitan LHU terenkripsi.",
      en: "Digital sample intake, lab code tracking, and encrypted LHU issuance.",
    },
    highlights: {
      id: [
        "Upload dokumen LHU, portal unduh terenkripsi AES-256-CBC di private storage, checksum SHA-256, dan audit trail otomatis",
        "E-Ticket PDF ber-barcode, visual timeline tracking (TU-LAB-2026-0042), serta 30 skenario PHPUnit & Laravel Dusk",
      ],
      en: [
        "LHU document uploads, AES-256-CBC encrypted private storage downloads, SHA-256 checksums, and automatic audit trail",
        "Barcode PDF E-Tickets, real-time visual timeline tracking, and automated PHPUnit & Laravel Dusk test suites",
      ],
    },
    stack: ["Laravel 8", "PHP 8.2", "Tailwind CSS 3", "MySQL", "AES-256-CBC", "PHPUnit & Dusk"],
  },
  {
    id: "fraud-dashboard",
    name: "Credit Card Fraud Monitoring Dashboard",
    shortName: "Fraud Dashboard",
    url: "https://public.tableau.com/app/profile/hainur.fadillah/viz/CreditCardFraudDashboard_Hainur/CreditCardFraudDashboard?publish=yes",
    categories: ["Data Analytics"],
    role: { id: "Data Analyst & Author", en: "Data Analyst & Author" },
    shortTag: { id: "Tableau BI", en: "Tableau BI" },
    screenshot: {
      src: fraudImg,
      width: 1440,
      height: 796,
      alt: {
        id: "Tangkapan layar Credit Card Fraud Monitoring Dashboard di Tableau Public",
        en: "Screenshot of Credit Card Fraud Monitoring Dashboard on Tableau Public",
      },
    },
    metricValue: 299984,
    metricDisplay: { id: "299.984 Transaksi", en: "299,984 Txns" },
    metricLabel: {
      id: "1.995 fraud · $263.986 (0,67%)",
      en: "1,995 frauds · $263,986 (0.67%)",
    },
    starGreek: "δ",
    starName: "Ruchbah",
    coordLabel: "CASSIOPEIA · δ Cas (Ruchbah) · 01h26m +60°",
    lat: -12,
    lon: 131,
    summary: {
      id: "Dashboard risiko fraud kartu kredit berbasis Gradient Boosting di Tableau Public.",
      en: "Gradient Boosting credit card fraud risk dashboard published on Tableau Public.",
    },
    impactLine: {
      id: "Monitoring 299.984 transaksi uji ($263.986 eksposur fraud) di Tableau Public.",
      en: "Monitoring 299,984 test transactions ($263,986 fraud exposure) on Tableau Public.",
    },
    highlights: {
      id: [
        "No Auth menyumbang 53,83% kasus vs Biometric 2,11%",
        "Heatmap CVV Retry × IP Mismatch mencapai risiko 100%",
      ],
      en: [
        "No Auth accounts for 53.83% of cases vs Biometric 2.11%",
        "CVV Retry × IP Mismatch heatmap reaches 100% risk",
      ],
    },
    stack: ["Tableau Public", "Gradient Boosting", "Risk Analytics"],
  },
  {
    id: "pokemon-analytics",
    name: "POKÉDATA // TERMINAL",
    shortName: "PokéData ML",
    url: "https://pokemonkelompok10.streamlit.app/",
    categories: ["Data Analytics"],
    role: {
      id: "Full-Stack Web Dev & Project Manager",
      en: "Full-Stack Web Dev & Project Manager",
    },
    shortTag: { id: "Streamlit ML", en: "Streamlit ML" },
    screenshot: {
      src: pokedataImg,
      width: 1440,
      height: 630,
      alt: {
        id: "Tangkapan layar POKÉDATA // TERMINAL di Streamlit",
        en: "Screenshot of POKÉDATA // TERMINAL on Streamlit",
      },
    },
    metricValue: 48048,
    metricDisplay: { id: "48.048 Laga", en: "48,048 Battles" },
    metricLabel: {
      id: "800 Pokémon · 3 model ML",
      en: "800 Pokémon · 3 ML models",
    },
    starGreek: "γ",
    starName: "Navi",
    coordLabel: "CASSIOPEIA · γ Cas (Navi) · 00h57m +61°",
    lat: 11,
    lon: 112,
    summary: {
      id: "Aplikasi Streamlit untuk klasterisasi statistik dan prediksi hasil pertarungan Pokémon.",
      en: "Streamlit app for Pokémon stat clustering and battle outcome prediction.",
    },
    impactLine: {
      id: "Klasterisasi & prediksi 48.048 laga Pokémon dengan 3 algoritma ML.",
      en: "Clustering & prediction across 48,048 Pokémon battles with 3 ML models.",
    },
    highlights: {
      id: [
        "5 modul: EDA, K-Means, Prediksi, Evaluasi & Simulator",
        "6 generasi, 18 tipe, dan 65 entitas Legendary",
      ],
      en: [
        "5 modules: EDA, K-Means, Predict, Eval & Simulator",
        "6 generations, 18 types, and 65 Legendary entities",
      ],
    },
    stack: ["Python", "Streamlit", "K-Means", "LogReg", "Naive Bayes"],
  },
  {
    id: "nusantara-atlas",
    name: "Nusantara Atlas",
    shortName: "Nusantara Atlas",
    url: "https://nusantara-atlas.org/",
    categories: ["Data Analytics", "Info Systems"],
    role: { id: "Role: Data Contributor", en: "Role: Data Contributor" },
    isContributor: true,
    contributorNote: {
      id: "Bukan pembuat atau pengembang situs Nusantara Atlas.",
      en: "Not the creator or developer of the Nusantara Atlas website.",
    },
    shortTag: { id: "Data Contributor", en: "Data Contributor" },
    screenshot: null,
    metricValue: null,
    metricDisplay: { id: "Kalimantan Timur", en: "East Kalimantan" },
    metricLabel: {
      id: "Penghubung laporan warga lokal",
      en: "Local community data bridge",
    },
    starGreek: "ε",
    starName: "Segin",
    coordLabel: "CASSIOPEIA · ε Cas (Segin) · 01h54m +64°",
    lat: 17,
    lon: 150,
    summary: {
      id: "Fokus khusus di Kalimantan Timur sebagai kontributor data yang menghubungkan laporan masyarakat lokal ke Nusantara Atlas, termasuk kasus karhutla Kaltim baru-baru ini.",
      en: "Focused exclusively on East Kalimantan as a data contributor bridging local community reports to Nusantara Atlas, including recent East Kalimantan wildfires.",
    },
    impactLine: {
      id: "Role: Data Contributor khusus Kalimantan Timur, menghubungkan laporan warga (mis. karhutla Kaltim) ke Nusantara Atlas.",
      en: "Role: Data Contributor for East Kalimantan, bridging local reports (e.g. recent wildfires) to Nusantara Atlas.",
    },
    highlights: {
      id: [],
      en: [],
    },
    stack: ["Kalimantan Timur", "Pelaporan Karhutla", "Data Lapangan"],
  },
];
