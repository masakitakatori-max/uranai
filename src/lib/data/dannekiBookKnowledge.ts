export interface DannekiBookRule {
  id: string;
  title: string;
  summary: string;
  sourceImages: string[];
  tags: string[];
}

export interface DannekiBookCase {
  id: string;
  title: string;
  sourceImage: string;
  questionType: string;
  coreLesson: string;
  tags: string[];
  matchTokens: Array<{ text: string; weight: number }>;
  matchThreshold: number;
}

export const DANNEKI_BOOK_RULES: DannekiBookRule[] = [
  {
    id: "question-focus",
    title: "質問の焦点を先に固定する",
    summary: "六爻を立てる前に、何を読むのかを一文で固定する。曖昧な問いは世応や用神がぶれて外しやすい。",
    sourceImages: ["img_0018", "img_0044"],
    tags: ["導入", "世応", "用神"],
  },
  {
    id: "use-god-by-topic",
    title: "用神は占的で変わる",
    summary: "人、物、関係、可否、時期などで重視する爻が変わる。対象を先に決めてから六親へ落とす。",
    sourceImages: ["img_0003", "img_0065", "img_0081"],
    tags: ["用神", "六親", "対象推定"],
  },
  {
    id: "world-response",
    title: "争点や関係は世応で読む",
    summary: "対立や相手比較の問いでは、世爻と応爻の役割を先に決める。誰が世で誰が応かを立卦前に固定する。",
    sourceImages: ["img_0044", "img_0069"],
    tags: ["世応", "対立", "関係線"],
  },
  {
    id: "palace-as-root",
    title: "宮を基準に六親を立てる",
    summary: "断易では宮の五行を軸にして六親を読む。日干だけで六親を決めるのではなく、卦宮を基準にする。",
    sourceImages: ["img_0033"],
    tags: ["宮", "六親", "納甲"],
  },
  {
    id: "strength-by-time",
    title: "月建・日辰・空亡で強弱を見る",
    summary: "旺相休囚死、空亡、日辰の冲合で爻の実効力を判定する。単独の五行だけで断定しない。",
    sourceImages: ["img_0065", "img_0079", "img_0081"],
    tags: ["旺相休囚死", "空亡", "日辰"],
  },
  {
    id: "moving-line",
    title: "動爻は変化点",
    summary: "動爻は静止していない部分であり、結果の転換や攻防の起点として優先して読む。",
    sourceImages: ["img_0065", "img_0069", "img_0073", "img_0079"],
    tags: ["動爻", "変爻", "進神"],
  },
  {
    id: "hidden-and-broken",
    title: "伏神と六冲は保留信号",
    summary: "見えていない爻や六冲の盤は、表面の記号よりも保留や不安定を示しやすい。見えない要素を探す。",
    sourceImages: ["img_0063", "img_0069"],
    tags: ["伏神", "六冲", "保留"],
  },
  {
    id: "practical-result",
    title: "実例の結果で理屈を検証する",
    summary: "書籍は理論だけでなく、事件、贈り物、試合、災害、物流などの実例で読み筋を確認している。",
    sourceImages: ["img_0003", "img_0065", "img_0069", "img_0073", "img_0079", "img_0081"],
    tags: ["実例", "検証", "応用"],
  },
];

export const DANNEKI_BOOK_CASES: DannekiBookCase[] = [
  {
    id: "jonbenet-murder",
    title: "ジョンベネ殺害事件",
    sourceImage: "img_0003",
    questionType: "事件・人物特定",
    coreLesson: "子どもを探す問いでは子の象意と動爻を優先して読む。攻撃側は官鬼として現れやすい。",
    tags: ["事件", "人物特定", "子", "官鬼"],
    matchTokens: [{ text: "ジョンベネ", weight: 3 }, { text: "殺害", weight: 2 }, { text: "子ども", weight: 1 }],
    matchThreshold: 3,
  },
  {
    id: "clinton-scandal",
    title: "クリントン大統領のスキャンダル",
    sourceImage: "img_0044",
    questionType: "対立・存続可否",
    coreLesson: "争点は世応を先に固定し、世の強さと応の反応を比べる。コイン前に役割を決めるのが肝。",
    tags: ["世応", "対立", "存続"],
    matchTokens: [
      { text: "クリントン", weight: 3 },
      { text: "スキャンダル", weight: 2 },
      { text: "大統領", weight: 1 },
      { text: "共和党", weight: 1 },
      { text: "生き残", weight: 1 },
    ],
    matchThreshold: 3,
  },
  {
    id: "birthday-gift",
    title: "誕生日プレゼントの推測",
    sourceImage: "img_0065",
    questionType: "物品推測",
    coreLesson: "官が動いて子に変わると、真面目さがほどけて遊びや娯楽へ寄る。高価さより性質を読む。",
    tags: ["物品", "官", "子", "変爻"],
    matchTokens: [
      { text: "誕生日プレゼント", weight: 3 },
      { text: "誕生日", weight: 1 },
      { text: "プレゼント", weight: 1 },
      { text: "贈り物", weight: 1 },
    ],
    matchThreshold: 3,
  },
  {
    id: "chelsea-match",
    title: "チェルシー対マンチェスター・ユナイテッド",
    sourceImage: "img_0069",
    questionType: "勝敗予測",
    coreLesson: "動爻の冲があっても月建に潰されると攻撃は実を結ばない。六冲は質問側の誤りも示しうる。",
    tags: ["勝敗", "六冲", "月建", "動爻"],
    matchTokens: [
      { text: "チェルシー", weight: 3 },
      { text: "マンチェスター", weight: 2 },
      { text: "サッカー", weight: 1 },
      { text: "試合", weight: 1 },
    ],
    matchThreshold: 3,
  },
  {
    id: "earth-disaster",
    title: "2012年の破滅的災害",
    sourceImage: "img_0073",
    questionType: "大局・長期予測",
    coreLesson: "長期の大局では、世爻の弱さと動爻の進み方が未来の変化量を示す。局所よりスケールを読む。",
    tags: ["大局", "進神", "長期", "世爻"],
    matchTokens: [
      { text: "破滅的な災害", weight: 3 },
      { text: "2012", weight: 2 },
      { text: "災害", weight: 1 },
      { text: "地球", weight: 1 },
    ],
    matchThreshold: 3,
  },
  {
    id: "global-warming",
    title: "地球温暖化の影響",
    sourceImage: "img_0079",
    questionType: "時事・趨勢",
    coreLesson: "空亡の世は具体成果が出にくい。議論が多くても、実体の伴わない空転に注意する。",
    tags: ["空亡", "趨勢", "時事"],
    matchTokens: [
      { text: "地球温暖化", weight: 3 },
      { text: "温暖化", weight: 2 },
      { text: "気候変動", weight: 2 },
      { text: "世界", weight: 1 },
    ],
    matchThreshold: 3,
  },
  {
    id: "sheep-shipping",
    title: "オーストラリアの羊の輸送",
    sourceImage: "img_0081",
    questionType: "物流・保全",
    coreLesson: "世を対象物、官を行政行動として読む。官が助けに変わるなら外部の支援や買い手発見を読む。",
    tags: ["物流", "官", "世爻", "保全"],
    matchTokens: [
      { text: "羊の輸送", weight: 3 },
      { text: "羊", weight: 1 },
      { text: "輸送", weight: 1 },
      { text: "買い手", weight: 1 },
    ],
    matchThreshold: 3,
  },
];
