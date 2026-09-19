import type { DimensionCode, IndicatorCode, IndicatorDef } from "./types";

export const DIMENSION_META: Record<
  DimensionCode,
  { nameEn: string; nameId: string; indicators: IndicatorCode[] }
> = {
  MANAGERIAL: {
    nameEn: "Managerial",
    nameId: "Manajerial",
    indicators: ["SPI", "CPI", "SC"],
  },
  AGILITY: {
    nameEn: "Agility",
    nameId: "Ketangkasan",
    indicators: ["VS", "CR", "FIR"],
  },
  SPATIAL_GOVERNANCE: {
    nameEn: "Spatial Governance",
    nameId: "Tata Kelola Spasial",
    indicators: ["ACC", "XAI", "PDP", "OGC"],
  },
};

export const DIMENSION_ORDER: DimensionCode[] = [
  "MANAGERIAL",
  "AGILITY",
  "SPATIAL_GOVERNANCE",
];

function levelAnchors(labels: [string, string, string, string, string], labelsId: [string, string, string, string, string]) {
  return labels.map((en, i) => ({
    level: (i + 1) as 1 | 2 | 3 | 4 | 5,
    en,
    id: labelsId[i],
  }));
}

export const INDICATORS: Record<IndicatorCode, IndicatorDef> = {
  SPI: {
    code: "SPI",
    dimension: "MANAGERIAL",
    nameEn: "Schedule Performance Index",
    nameId: "Indeks Kinerja Jadwal",
    quickAnchors: levelAnchors(
      [
        "Severely behind schedule (SPI < 0.7)",
        "Behind schedule (0.7 ≤ SPI < 0.85)",
        "Slightly behind (0.85 ≤ SPI < 0.95)",
        "On schedule (0.95 ≤ SPI ≤ 1.05)",
        "Ahead of schedule (SPI > 1.05, well controlled)",
      ],
      [
        "Sangat terlambat dari jadwal (SPI < 0.7)",
        "Terlambat dari jadwal (0.7 ≤ SPI < 0.85)",
        "Sedikit terlambat (0.85 ≤ SPI < 0.95)",
        "Sesuai jadwal (0.95 ≤ SPI ≤ 1.05)",
        "Lebih cepat dari jadwal (SPI > 1.05, terkendali baik)",
      ]
    ),
    preciseFields: [
      { key: "ev", labelEn: "Earned Value (EV)", labelId: "Earned Value (EV)" },
      { key: "pv", labelEn: "Planned Value (PV)", labelId: "Planned Value (PV)" },
    ],
    preciseHelpEn: "SPI = EV / PV. Normalized by distance-to-target (target = 1.0).",
    preciseHelpId: "SPI = EV / PV. Dinormalisasi berdasarkan jarak-ke-target (target = 1.0).",
  },
  CPI: {
    code: "CPI",
    dimension: "MANAGERIAL",
    nameEn: "Cost Performance Index",
    nameId: "Indeks Kinerja Biaya",
    quickAnchors: levelAnchors(
      [
        "Severely over budget (CPI < 0.7)",
        "Over budget (0.7 ≤ CPI < 0.85)",
        "Slightly over budget (0.85 ≤ CPI < 0.95)",
        "On budget (0.95 ≤ CPI ≤ 1.05)",
        "Under budget, well controlled (CPI > 1.05)",
      ],
      [
        "Sangat melebihi anggaran (CPI < 0.7)",
        "Melebihi anggaran (0.7 ≤ CPI < 0.85)",
        "Sedikit melebihi anggaran (0.85 ≤ CPI < 0.95)",
        "Sesuai anggaran (0.95 ≤ CPI ≤ 1.05)",
        "Di bawah anggaran, terkendali baik (CPI > 1.05)",
      ]
    ),
    preciseFields: [
      { key: "ev", labelEn: "Earned Value (EV)", labelId: "Earned Value (EV)" },
      { key: "ac", labelEn: "Actual Cost (AC)", labelId: "Actual Cost (AC)" },
    ],
    preciseHelpEn: "CPI = EV / AC. Normalized by distance-to-target (target = 1.0).",
    preciseHelpId: "CPI = EV / AC. Dinormalisasi berdasarkan jarak-ke-target (target = 1.0).",
  },
  SC: {
    code: "SC",
    dimension: "MANAGERIAL",
    nameEn: "Scope Stability",
    nameId: "Stabilitas Ruang Lingkup",
    quickAnchors: levelAnchors(
      [
        "Scope changed drastically, no control process",
        "Frequent uncontrolled scope changes",
        "Some scope changes, mostly controlled",
        "Minor scope changes, fully controlled",
        "No uncontrolled scope change from baseline",
      ],
      [
        "Ruang lingkup berubah drastis, tanpa proses kendali",
        "Perubahan ruang lingkup sering terjadi tanpa kendali",
        "Beberapa perubahan ruang lingkup, sebagian besar terkendali",
        "Perubahan ruang lingkup kecil, sepenuhnya terkendali",
        "Tidak ada perubahan ruang lingkup tak terkendali dari baseline",
      ]
    ),
    preciseFields: [
      { key: "baselineItems", labelEn: "Baseline scope items", labelId: "Item ruang lingkup baseline" },
      { key: "changedItems", labelEn: "Uncontrolled changed items", labelId: "Item berubah tak terkendali" },
    ],
    preciseHelpEn: "Scope stability = 1 − (changed items / baseline items), clamped to [0,1].",
    preciseHelpId: "Stabilitas lingkup = 1 − (item berubah / item baseline), dibatasi ke [0,1].",
  },
  VS: {
    code: "VS",
    dimension: "AGILITY",
    nameEn: "Velocity Stability",
    nameId: "Stabilitas Velositas",
    quickAnchors: levelAnchors(
      [
        "Velocity highly erratic vs. plan",
        "Velocity often deviates from plan",
        "Velocity occasionally deviates from plan",
        "Velocity close to plan most sprints",
        "Velocity consistently matches plan",
      ],
      [
        "Velositas sangat tidak stabil terhadap rencana",
        "Velositas sering menyimpang dari rencana",
        "Velositas kadang menyimpang dari rencana",
        "Velositas mendekati rencana di sebagian besar sprint",
        "Velositas konsisten sesuai rencana",
      ]
    ),
    preciseFields: [
      { key: "plannedVelocity", labelEn: "Planned velocity", labelId: "Velositas rencana" },
      { key: "actualVelocity", labelEn: "Actual velocity", labelId: "Velositas aktual" },
    ],
    preciseHelpEn: "VS ratio = actual / planned velocity. Normalized by distance-to-target (target = 1.0).",
    preciseHelpId: "Rasio VS = velositas aktual / rencana. Dinormalisasi jarak-ke-target (target = 1.0).",
  },
  CR: {
    code: "CR",
    dimension: "AGILITY",
    nameEn: "Change Response",
    nameId: "Responsivitas Perubahan",
    quickAnchors: levelAnchors(
      [
        "Change requests take far longer than target to address",
        "Change requests usually slower than target",
        "Change requests sometimes slower than target",
        "Change requests mostly meet target response time",
        "Change requests consistently meet or beat target",
      ],
      [
        "Permintaan perubahan jauh lebih lama dari target",
        "Permintaan perubahan biasanya lebih lambat dari target",
        "Permintaan perubahan kadang lebih lambat dari target",
        "Permintaan perubahan umumnya memenuhi target",
        "Permintaan perubahan konsisten memenuhi atau melebihi target",
      ]
    ),
    preciseFields: [
      { key: "avgResponseDays", labelEn: "Average response time (days)", labelId: "Rata-rata waktu respons (hari)" },
      { key: "targetResponseDays", labelEn: "Target response time (days)", labelId: "Target waktu respons (hari)" },
    ],
    preciseHelpEn: "CR = target / average response time, clamped to [0,1].",
    preciseHelpId: "CR = target / rata-rata waktu respons, dibatasi ke [0,1].",
  },
  FIR: {
    code: "FIR",
    dimension: "AGILITY",
    nameEn: "Feedback Incorporation Rate",
    nameId: "Tingkat Pemanfaatan Umpan Balik",
    quickAnchors: levelAnchors(
      [
        "Stakeholder feedback rarely incorporated",
        "Feedback occasionally incorporated",
        "About half of feedback incorporated",
        "Most feedback incorporated",
        "Nearly all feedback incorporated into backlog",
      ],
      [
        "Umpan balik pemangku kepentingan jarang ditindaklanjuti",
        "Umpan balik kadang ditindaklanjuti",
        "Sekitar setengah umpan balik ditindaklanjuti",
        "Sebagian besar umpan balik ditindaklanjuti",
        "Hampir semua umpan balik ditindaklanjuti ke backlog",
      ]
    ),
    preciseFields: [
      { key: "incorporated", labelEn: "Feedback items incorporated", labelId: "Item umpan balik ditindaklanjuti" },
      { key: "received", labelEn: "Feedback items received", labelId: "Item umpan balik diterima" },
    ],
    preciseHelpEn: "FIR = incorporated / received, clamped to [0,1].",
    preciseHelpId: "FIR = ditindaklanjuti / diterima, dibatasi ke [0,1].",
  },
  ACC: {
    code: "ACC",
    dimension: "SPATIAL_GOVERNANCE",
    nameEn: "Positional Accuracy",
    nameId: "Akurasi Posisi",
    quickAnchors: levelAnchors(
      [
        "RMSE far exceeds tolerance (> 2×T)",
        "RMSE well above tolerance (1.5×T–2×T)",
        "RMSE somewhat above tolerance (1×T–1.5×T)",
        "RMSE within tolerance, near limit",
        "RMSE comfortably within tolerance",
      ],
      [
        "RMSE jauh melebihi toleransi (> 2×T)",
        "RMSE jauh di atas toleransi (1,5×T–2×T)",
        "RMSE sedikit di atas toleransi (1×T–1,5×T)",
        "RMSE dalam toleransi, mendekati batas",
        "RMSE jauh di dalam batas toleransi",
      ]
    ),
    preciseFields: [
      { key: "rmse", labelEn: "RMSE", labelId: "RMSE" },
      { key: "tolerance", labelEn: "Tolerance (T)", labelId: "Toleransi (T)" },
    ],
    preciseHelpEn: "Normalized = 1 − (RMSE / T), clamped to [0,1]; lower RMSE relative to tolerance is better.",
    preciseHelpId: "Dinormalisasi = 1 − (RMSE / T), dibatasi ke [0,1]; RMSE relatif lebih kecil terhadap toleransi lebih baik.",
  },
  OGC: {
    code: "OGC",
    dimension: "SPATIAL_GOVERNANCE",
    nameEn: "Spatial Standards Compliance (OGC)",
    nameId: "Kepatuhan Standar Spasial (OGC)",
    quickAnchors: levelAnchors(
      [
        "No recognized spatial interoperability standards implemented",
        "Few required standards implemented",
        "About half of required standards implemented",
        "Most required standards implemented",
        "All required OGC/interoperability standards implemented",
      ],
      [
        "Tidak ada standar interoperabilitas spasial yang diterapkan",
        "Sedikit standar wajib diterapkan",
        "Sekitar setengah standar wajib diterapkan",
        "Sebagian besar standar wajib diterapkan",
        "Semua standar OGC/interoperabilitas wajib diterapkan",
      ]
    ),
    preciseFields: [
      { key: "implemented", labelEn: "Standards implemented", labelId: "Standar diterapkan" },
      { key: "required", labelEn: "Standards required", labelId: "Standar wajib" },
    ],
    preciseHelpEn: "OGC = implemented / required standards, clamped to [0,1].",
    preciseHelpId: "OGC = standar diterapkan / wajib, dibatasi ke [0,1].",
  },
  XAI: {
    code: "XAI",
    dimension: "SPATIAL_GOVERNANCE",
    nameEn: "Explainability (XAI)",
    nameId: "Keterjelasan (XAI)",
    quickAnchors: levelAnchors(
      [
        "No key decisions meet verification conditions",
        "Few key decisions meet verification conditions",
        "About half of key decisions meet verification conditions",
        "Most key decisions meet verification conditions",
        "All key decisions meet all four verification conditions",
      ],
      [
        "Tidak ada keputusan kunci memenuhi kondisi verifikasi",
        "Sedikit keputusan kunci memenuhi kondisi verifikasi",
        "Sekitar setengah keputusan kunci memenuhi kondisi verifikasi",
        "Sebagian besar keputusan kunci memenuhi kondisi verifikasi",
        "Semua keputusan kunci memenuhi keempat kondisi verifikasi",
      ]
    ),
    structured: "XAI",
    preciseHelpEn:
      "Proportion of key decisions meeting all four conditions: attribution record exists; faithfulness/sensitivity thresholds met; complexity below ceiling; plain-language summary available.",
    preciseHelpId:
      "Proporsi keputusan kunci yang memenuhi keempat kondisi: catatan atribusi ada; ambang faithfulness/sensitivitas terpenuhi; kompleksitas di bawah batas; ringkasan bahasa awam tersedia.",
  },
  PDP: {
    code: "PDP",
    dimension: "SPATIAL_GOVERNANCE",
    nameEn: "Personal Data Protection (PDP)",
    nameId: "Perlindungan Data Pribadi (PDP)",
    quickAnchors: levelAnchors(
      [
        "No statutory PDP items addressed",
        "Few PDP items addressed, mostly informal",
        "About half of PDP items formally addressed",
        "Most PDP items formally addressed",
        "All seven statutory PDP items fully addressed",
      ],
      [
        "Tidak ada item PDP wajib yang dipenuhi",
        "Sedikit item PDP dipenuhi, sebagian besar informal",
        "Sekitar setengah item PDP dipenuhi secara formal",
        "Sebagian besar item PDP dipenuhi secara formal",
        "Ketujuh item PDP wajib dipenuhi sepenuhnya",
      ]
    ),
    structured: "PDP",
    preciseHelpEn:
      "Severity-weighted mean of the 7 statutory sub-items (lawful basis, purpose limitation, minimization, retention, DPIA, data-subject rights, breach notification), each scored 0 / 0.5 / 1.",
    preciseHelpId:
      "Rata-rata berbobot severitas dari 7 sub-item wajib (dasar hukum, pembatasan tujuan, minimisasi, retensi, DPIA, hak subjek data, notifikasi pelanggaran), masing-masing dinilai 0 / 0,5 / 1.",
  },
};

export const INDICATOR_CODES: IndicatorCode[] = Object.keys(INDICATORS) as IndicatorCode[];

export const PDP_SUB_ITEM_LABELS: Record<string, { en: string; id: string }> = {
  lawfulBasis: { en: "Lawful basis", id: "Dasar hukum" },
  purposeLimitation: { en: "Purpose limitation", id: "Pembatasan tujuan" },
  minimization: { en: "Data minimization", id: "Minimisasi data" },
  retention: { en: "Retention limits", id: "Batas retensi" },
  dpia: { en: "DPIA conducted", id: "DPIA dilaksanakan" },
  dataSubjectRights: { en: "Data-subject rights", id: "Hak subjek data" },
  breachNotification: { en: "Breach notification", id: "Notifikasi pelanggaran" },
};

export const XAI_CONDITION_LABELS: Record<string, { en: string; id: string }> = {
  attributionRecordExists: { en: "Attribution record exists", id: "Catatan atribusi ada" },
  faithfulnessThresholdMet: { en: "Faithfulness / sensitivity thresholds met", id: "Ambang faithfulness/sensitivitas terpenuhi" },
  complexityBelowCeiling: { en: "Complexity below ceiling", id: "Kompleksitas di bawah batas" },
  plainLanguageSummaryAvailable: { en: "Plain-language summary available", id: "Ringkasan bahasa awam tersedia" },
};
