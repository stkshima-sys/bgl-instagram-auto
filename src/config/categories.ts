export interface Category {
  id: string;
  name: string;
  /** 出現比率の重み（同タイプ内で合計100） */
  weight: number;
  /** 企画生成AIへのヒント */
  hint: string;
}

/**
 * フィード（カルーセル・毎日12:00/19:00の2回）カテゴリと比率。
 * ブランド方針: 球場グルメ30% / 観戦コーデ20% / 一人観戦15% / 初心者15% / 球場紹介10% / 推し活10%
 */
export const CAROUSEL_CATEGORIES: Category[] = [
  { id: "gourmet", name: "球場グルメ", weight: 30, hint: "球場ごとの名物・映えメニュー・値段・売店の場所・食べる順番。保存需要が最も高い看板ジャンル" },
  { id: "code", name: "観戦コーデ", weight: 20, hint: "季節×球場別の観戦コーデ。涼しさ/暖かさ×可愛さの両立、バッグの中身、NG例もやんわり" },
  { id: "solo", name: "一人観戦", weight: 15, hint: "一人観戦のハードルを下げる。おすすめ座席、過ごし方、持ち物、「意外と平気」という共感" },
  { id: "beginner", name: "初心者ガイド", weight: 15, hint: "チケットの買い方、座席の選び方、ルール入門、観戦マナー、持ち物リスト" },
  { id: "stadium", name: "球場紹介", weight: 10, hint: "各球場の魅力・アクセス・座席ガイド・周辺カフェやスポットもセットで" },
  { id: "oshikatsu", name: "推し活", weight: 10, hint: "推し選手の応援方法、ユニフォームの可愛い着こなし、うちわ・ボード作り、グッズ収納" },
];

/** リール（毎日21:00）カテゴリと比率 */
export const REEL_CATEGORIES: Category[] = [
  { id: "solo_vlog", name: "一人観戦Vlog風", weight: 25, hint: "入場→売店→座席→乾杯→帰り道の余韻を一人称で。「一人でも楽しい」を伝える" },
  { id: "gourmet", name: "球場グルメ紹介", weight: 25, hint: "球場グルメを手に持って見せる・食べる瞬間・ビールと乾杯" },
  { id: "code", name: "観戦コーデ", weight: 15, hint: "着回し・コーデ紹介、球場コンコースでの全身ショット" },
  { id: "oshikatsu", name: "推し活動画", weight: 15, hint: "ユニフォーム姿で応援、タオルを掲げる、うちわを振る、スタンドの熱気" },
  { id: "beginner", name: "初心者の一日", weight: 10, hint: "初めての観戦のドキドキ→楽しかった、の感情の流れ" },
  { id: "stadium", name: "球場の景色", weight: 10, hint: "ナイター照明・夕暮れの球場・スタンドからの眺めなどエモーショナルな風景" },
];

/** リール撮影シーン候補（プロンプトに使う球場） */
export const STADIUMS = [
  "Tokyo Dome",
  "Meiji Jingu Stadium",
  "Yokohama Stadium",
  "Es Con Field Hokkaido",
  "PayPay Dome Fukuoka",
  "Koshien Stadium",
  "Vantelin Dome Nagoya",
];
