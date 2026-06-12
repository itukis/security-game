export type GlossaryTerm = {
  no: number;
  term: string;
  reading: string;
  summary: string;
  detail: string;
  countermeasures: string[];
};

// Sourced from 単語リスト.csv (initial 100 terms) plus curated additions.
// Sorted by reading (あいうえお order via localeCompare 'ja'). Readings that
// contain ）（ (an embedded Latin abbreviation, e.g. 'ATO）（あかうんとていくおーばー')
// are sorted by the kana portion after the ）（ separator so they land
// alongside their pure-kana peers instead of clustering by Latin prefix.
export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    "no": 82,
    "term": "IDS",
    "reading": "あいでぃーえす",
    "summary": "不正アクセスを検知するシステム。",
    "detail": "Intrusion Detection Systemの略。ネットワークや端末を監視し、攻撃の兆候を発見します。",
    "countermeasures": [
      "ログ分析",
      "ルール更新"
    ]
  },
  {
    "no": 15,
    "term": "IDOR",
    "reading": "あいどあ",
    "summary": "他人のデータへ不正アクセスできる脆弱性。",
    "detail": "URLのIDを書き換えるだけで他人の情報を閲覧できる状態です。\n\n例：\n```\n/profile?id=100\n↓\n/profile?id=101\n```",
    "countermeasures": [
      "所有者確認",
      "認可チェック"
    ]
  },
  {
    "no": 83,
    "term": "IPS",
    "reading": "あいぴーえす",
    "summary": "攻撃を検知して自動的に遮断するシステム。",
    "detail": "Intrusion Prevention Systemの略。IDSに加えて攻撃通信をブロックする機能を持ちます。",
    "countermeasures": [
      "適切なルール設定",
      "定期的な監視"
    ]
  },
  {
    "no": 39,
    "term": "アカウントテイクオーバー",
    "reading": "ATO）（あかうんとていくおーばー",
    "summary": "アカウントを乗っ取る攻撃。",
    "detail": "流出認証情報やフィッシングによってアカウントを支配します。",
    "countermeasures": [
      "MFA",
      "異常検知",
      "パスワード変更通知"
    ]
  },
  {
    "no": 46,
    "term": "アドウェア",
    "reading": "あどうぇあ",
    "summary": "大量の広告を表示するソフト。",
    "detail": "不要な広告を表示し、クリックを誘導して利益を得ます。",
    "countermeasures": [
      "不審ソフトを入れない",
      "ブラウザ管理"
    ]
  },
  {
    "no": 84,
    "term": "EDR",
    "reading": "いーでぃーあーる",
    "summary": "端末の異常を検知・対応する仕組み。",
    "detail": "Endpoint Detection and Responseの略。PCやサーバ上の不審な挙動を監視し、感染端末の隔離などを行います。",
    "countermeasures": [
      "全端末への導入",
      "アラート分析"
    ]
  },
  {
    "no": 70,
    "term": "Evil Twin",
    "reading": "いーびるついん",
    "summary": "偽Wi-Fiアクセスポイントによる攻撃。",
    "detail": "本物そっくりのSSIDを用意し、利用者を接続させて通信を盗みます。",
    "countermeasures": [
      "VPN利用",
      "正しいSSID確認"
    ]
  },
  {
    "no": 95,
    "term": "インシデントレスポンス",
    "reading": "いんしでんとれすぽんす",
    "summary": "セキュリティ事故への対応活動。",
    "detail": "検知から封じ込め、復旧、再発防止までの一連の対応を指します。",
    "countermeasures": [
      "手順書整備",
      "訓練実施"
    ]
  },
  {
    "no": 16,
    "term": "Insecure Deserialization",
    "reading": "いんせきゅあでしりありぜーしょん",
    "summary": "不正なデータ復元による攻撃。",
    "detail": "シリアライズデータを改ざんし、任意コード実行などを狙います。",
    "countermeasures": [
      "信頼できるデータのみ処理",
      "電子署名利用"
    ]
  },
  {
    "no": 41,
    "term": "ウイルス",
    "reading": "ういるす",
    "summary": "他のファイルに感染して増殖するマルウェア。",
    "detail": "生物のウイルスのように他のプログラムへ寄生し、実行されることで感染を広げます。ファイル破壊や情報漏えいを引き起こします。",
    "countermeasures": [
      "ウイルス対策ソフト",
      "OS更新",
      "不審ファイルを開かない"
    ]
  },
  {
    "term": "HTTP Strict Transport Security",
    "reading": "HSTS）（えいちえすてぃーえす",
    "summary": "ブラウザに HTTPS 接続を強制させるレスポンスヘッダ。",
    "detail": "Strict-Transport-Security ヘッダで、指定期間そのドメインへの平文 HTTP 接続を禁止します。中間者攻撃で HTTP に降格させる攻撃の防止に有効です。",
    "countermeasures": [
      "max-age を十分長く設定",
      "includeSubDomains を付与",
      "preload リスト登録を検討"
    ],
    "no": 103
  },
  {
    "term": "HttpOnly / Secure Cookie",
    "reading": "えいちてぃーてぃーぴーおんりーせきゅあくっきー",
    "summary": "Cookie に JavaScript からの読み取りや平文送信を禁じる属性。",
    "detail": "HttpOnly は document.cookie からのアクセスを禁止、Secure は HTTPS 接続でのみ送信を許可します。セッショントークンの盗難リスクを下げます。",
    "countermeasures": [
      "セッション Cookie に HttpOnly+Secure を必須化",
      "Set-Cookie ヘッダで両属性を明示",
      "サーバ側で Cookie 設定を一元管理"
    ],
    "no": 105
  },
  {
    "term": "HTTP Request Smuggling",
    "reading": "えいちてぃーてぃーぴーりくえすとすますりんぐ",
    "summary": "前段と後段のサーバで HTTP リクエストの境界解釈をずらす攻撃。",
    "detail": "Content-Length と Transfer-Encoding を意図的に矛盾させ、リバプロと後段が別々に区切ることで、攻撃者のリクエストを他人のセッションに紛れ込ませます。",
    "countermeasures": [
      "前段/後段で同じ HTTP パーサ実装に揃える",
      "Transfer-Encoding と Content-Length 併用を拒否",
      "プロキシとアプリを最新版に保つ"
    ],
    "no": 114
  },
  {
    "no": 12,
    "term": "HTTPレスポンス分割",
    "reading": "えいちてぃーてぃーぴーれすぽんすすぷりっと",
    "summary": "HTTPレスポンスを改ざんする攻撃。",
    "detail": "改行コードを注入し、サーバの応答内容を操作します。",
    "countermeasures": [
      "改行文字除去",
      "フレームワーク利用"
    ]
  },
  {
    "term": "HMAC",
    "reading": "HMAC）（えいちまっく",
    "summary": "共通鍵とハッシュ関数を組み合わせて作るメッセージ認証コード。",
    "detail": "本文に秘密鍵を混ぜたハッシュを付けることで、改ざんと送信者の正当性を同時に検証できます。Webhook 署名や API トークンの検証に広く使われます。",
    "countermeasures": [
      "SHA-256 以上のハッシュを使用",
      "鍵は十分なエントロピーで生成",
      "比較は時間定数比較 (constant-time)"
    ],
    "no": 115
  },
  {
    "no": 65,
    "term": "ARP Spoofing",
    "reading": "えーあーるぴーすぷーふぃんぐ",
    "summary": "LAN内で通信を盗聴する攻撃。",
    "detail": "ARPテーブルを書き換え、自身をルータだと偽装して通信を中継します。",
    "countermeasures": [
      "静的ARP",
      "スイッチ機能利用"
    ]
  },
  {
    "no": 76,
    "term": "SSL",
    "reading": "えすえすえる",
    "summary": "TLSの前身となる暗号通信技術。",
    "detail": "現在は脆弱性が多く、TLSへの移行が推奨されています。",
    "countermeasures": [
      "SSL無効化",
      "TLS利用"
    ]
  },
  {
    "no": 1,
    "term": "SQLインジェクション",
    "reading": "えすきゅーえるいんじぇくしょん",
    "summary": "SQL文を改変し、不正にデータベースを操作する攻撃。",
    "detail": "Webアプリがユーザー入力をそのままSQL文へ埋め込むと、攻撃者は特殊な文字列を入力してSQLの意味を変えられます。認証回避や情報漏えい、データ改ざんにつながる代表的な脆弱性です。",
    "countermeasures": [
      "プリペアドステートメントを利用",
      "入力値検証",
      "DB権限の最小化"
    ]
  },
  {
    "term": "SBOM",
    "reading": "SBOM）（えすぼむ",
    "summary": "ソフトウェアに含まれる依存コンポーネントの一覧 (部品表)。",
    "detail": "Software Bill of Materials。OSS のバージョンや出所を機械可読フォーマット (CycloneDX / SPDX) で記録し、新たな CVE が出たときの影響範囲を即座に特定できるようにします。",
    "countermeasures": [
      "ビルド時に SBOM を自動生成",
      "SCA ツールで CVE と照合",
      "外部納品物にも SBOM を要求"
    ],
    "no": 130
  },
  {
    "no": 6,
    "term": "XML External Entity",
    "reading": "XXE）（えっくすえっくすいー",
    "summary": "XML機能を悪用して内部情報を取得する攻撃。",
    "detail": "XMLパーサの外部エンティティ機能を利用し、サーバ内部ファイルや内部ネットワーク情報を取得します。",
    "countermeasures": [
      "外部エンティティ無効化",
      "XML利用の見直し"
    ]
  },
  {
    "no": 85,
    "term": "XDR",
    "reading": "えっくすでぃーあーる",
    "summary": "複数のセキュリティ情報を統合して分析する仕組み。",
    "detail": "EDRだけでなく、メールやネットワーク、クラウドなどの情報を統合して脅威を検知します。",
    "countermeasures": [
      "各システムとの連携",
      "継続的な運用"
    ]
  },
  {
    "no": 5,
    "term": "LDAPインジェクション",
    "reading": "えるだっぷいんじぇくしょん",
    "summary": "LDAP検索条件を改ざんする攻撃。",
    "detail": "LDAP認証や検索でユーザー入力をそのまま利用すると、検索条件を書き換えて認証回避や情報取得が可能になります。",
    "countermeasures": [
      "特殊文字のエスケープ",
      "パラメータ化"
    ]
  },
  {
    "no": 4,
    "term": "OSコマンドインジェクション",
    "reading": "おーえすこまんどいんじぇくしょん",
    "summary": "サーバ上で任意のコマンドを実行させる攻撃。",
    "detail": "ユーザー入力をOSコマンドに組み込む処理があると、攻撃者が追加コマンドを注入してサーバを操作できます。",
    "countermeasures": [
      "シェル実行を避ける",
      "パラメータ固定化",
      "入力値制限"
    ]
  },
  {
    "no": 27,
    "term": "OAuth",
    "reading": "おーおーす",
    "summary": "第三者サービスへ権限委譲する仕組み。",
    "detail": "Googleログインなどで利用されます。パスワードを渡さず認可だけを行います。",
    "countermeasures": [
      "Redirect URI検証",
      "トークン管理"
    ]
  },
  {
    "no": 28,
    "term": "OpenID Connect",
    "reading": "おーぷんあいでぃーこねくと",
    "summary": "OAuthに認証機能を追加した仕組み。",
    "detail": "ユーザー本人の確認を行うため、現代のSSOで広く利用されています。",
    "countermeasures": [
      "IDトークン検証",
      "HTTPS利用"
    ]
  },
  {
    "no": 10,
    "term": "オープンリダイレクト",
    "reading": "おーぷんりだいれくと",
    "summary": "悪意あるサイトへ誘導する脆弱性。",
    "detail": "リダイレクト先URLを自由に指定できる場合、利用者を偽サイトへ誘導できます。",
    "countermeasures": [
      "許可リスト方式",
      "URL検証"
    ]
  },
  {
    "term": "OWASP Top 10",
    "reading": "OWASP）（おーわすぷとっぷてん",
    "summary": "Web アプリケーションで最も影響の大きい脆弱性カテゴリのまとめ。",
    "detail": "OWASP コミュニティが数年おきに公開する代表的な脆弱性ランキング。アクセス制御不備、暗号の不適切な使用、インジェクションなどが上位に並びます。",
    "countermeasures": [
      "最新版を読み社内ガイドラインに反映",
      "各項目の自動チェックを CI に組み込み",
      "新規プロジェクトの設計レビュー基準に採用"
    ],
    "no": 122
  },
  {
    "no": 47,
    "term": "キーロガー",
    "reading": "きーろがー",
    "summary": "キーボード入力を記録するマルウェア。",
    "detail": "IDやパスワードを盗み取るためによく利用されます。",
    "countermeasures": [
      "EDR導入",
      "MFA利用"
    ]
  },
  {
    "no": 97,
    "term": "脅威インテリジェンス",
    "reading": "きょういいんてりじぇんす",
    "summary": "攻撃者や脅威に関する情報。",
    "detail": "攻撃手法やマルウェア情報を収集し、防御へ活用します。",
    "countermeasures": [
      "情報共有",
      "IOC活用"
    ]
  },
  {
    "no": 80,
    "term": "共通鍵暗号",
    "reading": "きょうつうかぎあんごう",
    "summary": "同じ鍵で暗号化と復号を行う方式。",
    "detail": "高速なため、大量データの暗号化に利用されます。AESが代表例です。",
    "countermeasures": [
      "鍵配送の保護",
      "定期的な鍵更新"
    ]
  },
  {
    "no": 11,
    "term": "クリックジャッキング",
    "reading": "くりっくじゃっきんぐ",
    "summary": "見えない画面をクリックさせる攻撃。",
    "detail": "透明なiframeを重ね、本来意図しないボタンを押させます。",
    "countermeasures": [
      "X-Frame-Options",
      "CSP frame-ancestors"
    ]
  },
  {
    "no": 53,
    "term": "Cryptojacking",
    "reading": "くりぷとじゃっきんぐ",
    "summary": "勝手に暗号資産を採掘する攻撃。",
    "detail": "PCやサーバのCPUを利用し、攻撃者の利益のためにマイニングを行います。",
    "countermeasures": [
      "CPU異常監視",
      "ブラウザ制御"
    ]
  },
  {
    "no": 23,
    "term": "クレデンシャルスタッフィング",
    "reading": "くれでんしゃるすたっふぃんぐ",
    "summary": "流出したID・パスワードを使い回す攻撃。",
    "detail": "他サービスから流出した認証情報を利用し、別サービスへのログインを試みます。",
    "countermeasures": [
      "MFA",
      "パスワード使い回し防止",
      "漏えい監視"
    ]
  },
  {
    "term": "Cross-Origin Resource Sharing",
    "reading": "CORS）（くろすおりじんりそーすしぇありんぐ",
    "summary": "別オリジンからのブラウザリクエストをサーバ側で許可・拒否する仕組み。",
    "detail": "サーバが Access-Control-Allow-Origin などのヘッダで、別オリジンの JavaScript からのアクセスを制御します。設定が緩いと CSRF やデータ漏えいの足がかりになります。",
    "countermeasures": [
      "Allow-Origin に '*' を返さない",
      "Allow-Credentials と '*' を併用しない",
      "許可するメソッド/ヘッダを最小化"
    ],
    "no": 102
  },
  {
    "no": 2,
    "term": "クロスサイトスクリプティング",
    "reading": "XSS）（くろすさいとすくりぷてぃんぐ",
    "summary": "悪意あるJavaScriptを実行させる攻撃。",
    "detail": "ユーザー入力を適切に処理せず画面へ表示すると、攻撃者が埋め込んだスクリプトが他ユーザーのブラウザで実行されます。Cookie窃取や偽画面表示などに悪用されます。",
    "countermeasures": [
      "HTMLエスケープ",
      "CSP導入",
      "入力値検証"
    ]
  },
  {
    "no": 3,
    "term": "クロスサイトリクエストフォージェリ",
    "reading": "CSRF）（くろすさいとりくえすとふぉーじぇり",
    "summary": "利用者になりすまして操作を実行させる攻撃。",
    "detail": "ログイン済みユーザーを攻撃者サイトへ誘導し、本人の意思とは関係なく送金や設定変更などのリクエストを実行させます。",
    "countermeasures": [
      "CSRFトークン",
      "SameSite Cookie",
      "再認証"
    ]
  },
  {
    "no": 31,
    "term": "権限昇格",
    "reading": "けんげんしょうかく",
    "summary": "本来持たない権限を取得する攻撃。",
    "detail": "一般ユーザーが管理者権限を獲得するなど、システムの制御を奪う攻撃です。",
    "countermeasures": [
      "権限分離",
      "最小権限原則"
    ]
  },
  {
    "no": 79,
    "term": "公開鍵暗号",
    "reading": "こうかいかぎあんごう",
    "summary": "公開鍵と秘密鍵を利用する暗号方式。",
    "detail": "公開鍵で暗号化し、秘密鍵で復号します。",
    "countermeasures": [
      "鍵長の確保",
      "鍵管理"
    ]
  },
  {
    "term": "Content Security Policy",
    "reading": "CSP）（こんてんつせきゅりてぃぽりしー",
    "summary": "ブラウザが読み込めるスクリプトや画像の出所をヘッダで制限する仕組み。",
    "detail": "サーバが返す Content-Security-Policy ヘッダで、スクリプト・画像・スタイルなどの読み込み元を許可リスト形式で指定します。XSS が成立しても外部スクリプトを読ませない多層防御として有効です。",
    "countermeasures": [
      "script-src を 'self' とハッシュ/nonce で限定",
      "unsafe-inline / unsafe-eval は使わない",
      "report-to / report-uri で違反を収集"
    ],
    "no": 101
  },
  {
    "no": 17,
    "term": "SSTI",
    "reading": "さーばさいどてんぷれーといんじぇくしょん",
    "summary": "テンプレートエンジンを悪用する攻撃。",
    "detail": "テンプレート構文を注入し、サーバ側でコード実行を狙います。",
    "countermeasures": [
      "入力値の直接埋込禁止"
    ]
  },
  {
    "no": 7,
    "term": "Server Side Request Forgery",
    "reading": "SSRF）（さーばさいどりくえすとふぉーじぇり",
    "summary": "サーバに不正な通信を行わせる攻撃。",
    "detail": "URL入力機能などを悪用し、サーバ自身から内部システムへアクセスさせます。",
    "countermeasures": [
      "接続先制限",
      "IPフィルタリング",
      "URL検証"
    ]
  },
  {
    "term": "Subdomain Takeover",
    "reading": "さぶどめいんてーくおーばー",
    "summary": "未使用のサブドメインを攻撃者が乗っ取って悪用する攻撃。",
    "detail": "外部 SaaS を解約したのに DNS の CNAME を残したままだと、その SaaS で同名スペースを取得した攻撃者がそのサブドメインを自分のものとして応答できます。",
    "countermeasures": [
      "不要な DNS レコードを定期棚卸し",
      "CNAME 先の所有を都度確認",
      "サブドメイン一覧を CI で監視"
    ],
    "no": 110
  },
  {
    "no": 93,
    "term": "サプライチェーン攻撃",
    "reading": "さぷらいちぇーんこうげき",
    "summary": "取引先やソフトウェア供給元を狙う攻撃。",
    "detail": "防御が堅い企業ではなく、関連企業や利用ライブラリを侵害して侵入します。",
    "countermeasures": [
      "ベンダー評価",
      "SBOM活用"
    ]
  },
  {
    "term": "SAML",
    "reading": "SAML）（さむる",
    "summary": "XML ベースの SSO 規格。企業向け ID 連携で広く使われる。",
    "detail": "認証情報を IdP が署名付き XML アサーションとして発行し、SP がそれを検証してログインさせます。XML 署名の検証不備や XXE が脆弱性源として知られています。",
    "countermeasures": [
      "XML 署名の正規化と検証を厳密に行う",
      "アサーションの宛先/有効期限を確認",
      "ライブラリは最新の脆弱性対応版を使う"
    ],
    "no": 119
  },
  {
    "term": "SameSite Cookie",
    "reading": "さめさいとくっきー",
    "summary": "別オリジンから自動送信される Cookie を制御する属性。",
    "detail": "Cookie の SameSite 属性 (Strict / Lax / None) で、クロスサイトリクエスト時に Cookie を送るかを制御します。CSRF 攻撃の主要な防御策の一つです。",
    "countermeasures": [
      "セッション Cookie は Lax 以上に設定",
      "クロスサイト前提のもののみ None+Secure",
      "古いブラウザ向けに CSRF トークンも併用"
    ],
    "no": 104
  },
  {
    "term": "Sandbox",
    "reading": "さんどぼっくす",
    "summary": "信頼できない処理を隔離環境で実行する仕組み。",
    "detail": "ブラウザのタブ分離、コンテナ、VM、seccomp/AppArmor などの形で実装され、外部入力を扱う処理の影響範囲を限定します。",
    "countermeasures": [
      "不審ファイル解析は使い捨て VM で実施",
      "ブラウザのサイト分離を有効化",
      "サーバ側コードはコンテナ + seccomp で動作"
    ],
    "no": 129
  },
  {
    "no": 88,
    "term": "CSIRT",
    "reading": "しーさーと",
    "summary": "インシデント対応専門チーム。",
    "detail": "Computer Security Incident Response Teamの略。事故発生時の調査・復旧・再発防止を担当します。",
    "countermeasures": [
      "手順整備",
      "定期訓練"
    ]
  },
  {
    "term": "CWE",
    "reading": "CWE）（しーだぶりゅーいー",
    "summary": "ソフトウェア脆弱性の分類カタログ。CVE がどの種類かを示す ID。",
    "detail": "MITRE が管理する Common Weakness Enumeration。たとえば SQL インジェクションは CWE-89 のように、原因クラスごとに ID が振られています。",
    "countermeasures": [
      "CVE 報告時に CWE を併記",
      "上位 CWE Top 25 を優先対策",
      "コードレビュー観点を CWE に揃える"
    ],
    "no": 123
  },
  {
    "no": 89,
    "term": "CVE",
    "reading": "しーぶいー",
    "summary": "脆弱性に付与される共通番号。",
    "detail": "世界中の脆弱性を一意に識別するための番号です。\n\n例：\n``` id=\"jmgd4l\"\nCVE-2021-44228\n```\n\n(Log4Shell)",
    "countermeasures": [
      "CVE情報の定期確認"
    ]
  },
  {
    "no": 90,
    "term": "CVSS",
    "reading": "しーぶいえすえす",
    "summary": "脆弱性の危険度評価指標。",
    "detail": "0〜10点で脆弱性の深刻度を数値化します。\n\n### 目安\n\n- 0〜3.9：低\n- 4.0〜6.9：中\n- 7.0〜8.9：高\n- 9.0〜10.0：緊急",
    "countermeasures": [
      "高スコアから優先対応"
    ]
  },
  {
    "no": 86,
    "term": "SIEM",
    "reading": "しーむ",
    "summary": "ログを集約して分析するシステム。",
    "detail": "Security Information and Event Managementの略。複数機器のログを統合し、異常を発見します。",
    "countermeasures": [
      "ログ収集範囲拡大",
      "相関分析設定"
    ]
  },
  {
    "term": "JSON Web Token",
    "reading": "JWT）（じぇいだぶりゅーてぃー",
    "summary": "署名付きの JSON をトークンとして使う認証情報フォーマット。",
    "detail": "ヘッダ・ペイロード・署名の 3 つを base64url で連結したトークン。サーバはステートレスにユーザ情報を検証できますが、署名検証や有効期限の運用ミスが脆弱性に直結します。",
    "countermeasures": [
      "alg を 'none' に書き換えられないよう許可一覧を固定",
      "短い有効期限 + Refresh Token 運用",
      "シークレットは十分なエントロピー"
    ],
    "no": 118
  },
  {
    "no": 94,
    "term": "シャドーIT",
    "reading": "しゃどーあいてぃー",
    "summary": "管理者が把握していないIT利用。",
    "detail": "従業員が勝手にクラウドサービスやアプリを利用することで情報漏えいリスクが高まります。",
    "countermeasures": [
      "利用ルール整備",
      "資産管理"
    ]
  },
  {
    "no": 26,
    "term": "シングルサインオン",
    "reading": "SSO）（しんぐるさいんおん",
    "summary": "一度の認証で複数サービスを利用する仕組み。",
    "detail": "利用者は複数のID・パスワードを管理する必要がなくなります。",
    "countermeasures": [
      "IdPの厳重管理",
      "MFA併用"
    ]
  },
  {
    "no": 63,
    "term": "SYN Flood",
    "reading": "しんふらっど",
    "summary": "TCP接続を悪用したDoS攻撃。",
    "detail": "接続要求（SYN）だけを大量送信し、サーバの接続待ち領域を枯渇させます。",
    "countermeasures": [
      "SYN Cookie",
      "接続数制限"
    ]
  },
  {
    "no": 59,
    "term": "Scareware",
    "reading": "すけあうぇあ",
    "summary": "不安を煽って購入させる偽ソフト。",
    "detail": "「ウイルスが見つかりました！」と表示し、有料ソフト購入を誘導します。",
    "countermeasures": [
      "公式ソフト利用",
      "利用者教育"
    ]
  },
  {
    "term": "Stored XSS",
    "reading": "すとあーどえっくすえすえす",
    "summary": "DB やファイルに保存された不正な文字列が他人の画面で発火する XSS。",
    "detail": "投稿フォーム経由でスクリプトを保存させ、別ユーザがそのページを開いたときにブラウザで実行されます。被害規模が大きく、影響が長期化しやすい型です。",
    "countermeasures": [
      "保存時の検証＋出力時のエスケープを徹底",
      "管理画面側のエスケープも忘れない",
      "CSP で外部スクリプトを抑止"
    ],
    "no": 108
  },
  {
    "no": 45,
    "term": "スパイウェア",
    "reading": "すぱいうぇあ",
    "summary": "利用者を監視するマルウェア。",
    "detail": "入力情報や閲覧履歴を収集し、攻撃者へ送信します。",
    "countermeasures": [
      "セキュリティソフト",
      "不審アプリ削除"
    ]
  },
  {
    "no": 37,
    "term": "スピアフィッシング",
    "reading": "すぴあふぃっしんぐ",
    "summary": "特定個人を狙うフィッシング。",
    "detail": "SNSや企業情報を調査し、信頼性の高い偽メールを送信します。",
    "countermeasures": [
      "メール訓練",
      "不審メール報告体制"
    ]
  },
  {
    "term": "Threat Modeling",
    "reading": "すれっともでりんぐ",
    "summary": "システムへの脅威を体系的に洗い出し、対策の優先度を決める手法。",
    "detail": "STRIDE などのフレームワークでデータフロー図に脅威を当てはめ、設計段階でリスクを潰します。実装後の脆弱性発見より遥かに安価です。",
    "countermeasures": [
      "STRIDE / PASTA などの方法論を採用",
      "設計フェーズで実施し記録を残す",
      "脅威ごとにテストケースを作る"
    ],
    "no": 124
  },
  {
    "no": 92,
    "term": "脆弱性診断",
    "reading": "ぜいじゃくせいしんだん",
    "summary": "システムの弱点を調査する作業。",
    "detail": "ツールや手動検査を利用して脆弱性の有無を確認します。",
    "countermeasures": [
      "リリース前実施",
      "定期再診断"
    ]
  },
  {
    "no": 96,
    "term": "セキュリティパッチ",
    "reading": "せきゅりてぃぱっち",
    "summary": "脆弱性を修正する更新プログラム。",
    "detail": "発見された脆弱性を修正するために提供されます。",
    "countermeasures": [
      "迅速な適用",
      "パッチ管理体制"
    ]
  },
  {
    "no": 100,
    "term": "セキュリティポリシー",
    "reading": "せきゅりてぃぽりしー",
    "summary": "組織のセキュリティ方針。",
    "detail": "情報資産を守るためのルールや運用方針を定めた文書です。技術的対策だけでなく、人や組織の行動基準も含まれます。",
    "countermeasures": [
      "定期見直し",
      "社員教育",
      "遵守状況の監査"
    ]
  },
  {
    "no": 30,
    "term": "セッション管理不備",
    "reading": "せっしょんかんりふび",
    "summary": "セッション運用の問題による脆弱性。",
    "detail": "推測可能なIDや失効処理不足によって乗っ取りリスクが高まります。",
    "countermeasures": [
      "強力な乱数利用",
      "適切なタイムアウト"
    ]
  },
  {
    "no": 29,
    "term": "セッションハイジャック",
    "reading": "せっしょんはいじゃっく",
    "summary": "セッションを盗んでなりすます攻撃。",
    "detail": "CookieやセッションIDを取得し、正規ユーザーとして操作を行います。",
    "countermeasures": [
      "HTTPS",
      "HttpOnly Cookie",
      "Secure属性"
    ]
  },
  {
    "no": 13,
    "term": "セッションフィクセーション",
    "reading": "せっしょんふぃくせーしょん",
    "summary": "攻撃者が指定したセッションIDを使わせる攻撃。",
    "detail": "被害者に既知のセッションIDを利用させ、ログイン後にそのセッションを乗っ取ります。",
    "countermeasures": [
      "ログイン時にセッション再発行"
    ]
  },
  {
    "no": 20,
    "term": "ゼロデイ攻撃",
    "reading": "ぜろでいこうげき",
    "summary": "修正前の脆弱性を狙う攻撃。",
    "detail": "開発者が脆弱性を認識してから修正するまでの期間を狙って攻撃します。防御が非常に難しく、被害が大きくなりやすい特徴があります。",
    "countermeasures": [
      "多層防御",
      "EDR導入",
      "迅速なパッチ適用"
    ]
  },
  {
    "no": 32,
    "term": "ゼロトラスト",
    "reading": "ぜろとらすと",
    "summary": "何も信用しない前提のセキュリティモデル。",
    "detail": "社内外を問わずすべてのアクセスを検証します。",
    "countermeasures": [
      "継続的認証",
      "デバイス管理"
    ]
  },
  {
    "no": 87,
    "term": "SOC",
    "reading": "そっく",
    "summary": "セキュリティ監視専門組織。",
    "detail": "Security Operation Centerの略。24時間体制で脅威を監視し、インシデントへ対応します。",
    "countermeasures": [
      "監視体制整備",
      "人材育成"
    ]
  },
  {
    "term": "Salt (Password Salt)",
    "reading": "そると",
    "summary": "パスワードハッシュに毎回違う乱数を混ぜて、レインボーテーブル攻撃を無効化する値。",
    "detail": "ユーザごとに異なるソルトを保存・付加してハッシュ化すれば、同じパスワードでも DB 内のハッシュは別物になり、事前計算テーブルが効かなくなります。",
    "countermeasures": [
      "ユーザごとにユニークなソルトを生成",
      "ソルトは最低 16 バイトの CSPRNG 生成",
      "bcrypt/Argon2 など内蔵ソルトのアルゴリズムを使う"
    ],
    "no": 116
  },
  {
    "no": 56,
    "term": "Downloader",
    "reading": "だうんろーだー",
    "summary": "マルウェアを取得するためのプログラム。",
    "detail": "感染後に攻撃サーバへ接続し、本命のマルウェアを取得します。",
    "countermeasures": [
      "通信監視",
      "URLフィルタリング"
    ]
  },
  {
    "no": 24,
    "term": "多要素認証",
    "reading": "MFA）（たようそにんしょう",
    "summary": "複数の認証要素を組み合わせる仕組み。",
    "detail": "パスワードに加え、スマホアプリや生体認証を利用して本人確認を強化します。",
    "countermeasures": [
      "全ユーザーへ適用",
      "SMS以外の認証方式推奨"
    ]
  },
  {
    "no": 72,
    "term": "DHCP Spoofing",
    "reading": "でぃーえいちしーぴーすぷーふぃんぐ",
    "summary": "偽DHCPサーバを利用する攻撃。",
    "detail": "攻撃者がネットワーク設定を配布し、通信を乗っ取ります。",
    "countermeasures": [
      "DHCP Snooping",
      "ネットワーク監視"
    ]
  },
  {
    "no": 67,
    "term": "DNS Cache Poisoning",
    "reading": "でぃーえぬえすきゃっしゅぽいずにんぐ",
    "summary": "DNSキャッシュを汚染する攻撃。",
    "detail": "DNSサーバに偽情報を保存させ、多数の利用者を偽サイトへ誘導します。",
    "countermeasures": [
      "DNSSEC",
      "DNSサーバ更新"
    ]
  },
  {
    "no": 66,
    "term": "DNS Spoofing",
    "reading": "でぃーえぬえすすぷーふぃんぐ",
    "summary": "偽のIPアドレスへ誘導する攻撃。",
    "detail": "DNS応答を改ざんし、本物のサイトへアクセスしたつもりの利用者を偽サイトへ誘導します。",
    "countermeasures": [
      "DNSSEC",
      "HTTPS確認"
    ]
  },
  {
    "no": 75,
    "term": "TLS",
    "reading": "てぃーえるえす",
    "summary": "通信を暗号化する仕組み。",
    "detail": "WebサイトのHTTPSで利用され、盗聴や改ざんを防止します。",
    "countermeasures": [
      "TLS1.2以上利用",
      "証明書管理"
    ]
  },
  {
    "no": 62,
    "term": "DDoS攻撃",
    "reading": "でぃーどすこうげき",
    "summary": "多数の端末から同時に行うDoS攻撃。",
    "detail": "ボットネットを利用して世界中の端末から攻撃を行うため、防御が困難です。",
    "countermeasures": [
      "DDoS対策サービス",
      "CDN活用",
      "トラフィック分析"
    ]
  },
  {
    "term": "Defense in Depth",
    "reading": "でぃふぇんすいんでぷす",
    "summary": "防御層を多段で重ね、1 層破られても被害が広がらない設計思想。",
    "detail": "WAF + アプリの入力検証 + DB の最小権限のように、独立した制御を重ねることで攻撃者のコストを増やします。多層防御とも呼ばれます。",
    "countermeasures": [
      "ネットワーク/アプリ/データ各層に独立した制御",
      "層ごとに監視と検知を別系統で構築",
      "層単位での障害復旧プランを用意"
    ],
    "no": 126
  },
  {
    "no": 8,
    "term": "ディレクトリトラバーサル",
    "reading": "でぃれくとりとらばーさる",
    "summary": "本来閲覧できないファイルへアクセスする攻撃。",
    "detail": "「../」などを利用してディレクトリを遡り、機密ファイルを取得します。",
    "countermeasures": [
      "パス固定化",
      "入力検証"
    ]
  },
  {
    "no": 78,
    "term": "デジタル署名",
    "reading": "でじたるしょめい",
    "summary": "電子的な本人確認と改ざん検知。",
    "detail": "公開鍵暗号を利用してデータの作成者と完全性を証明します。",
    "countermeasures": [
      "秘密鍵の厳重管理"
    ]
  },
  {
    "term": "DevSecOps",
    "reading": "でぶせくおっぷす",
    "summary": "開発・運用パイプラインにセキュリティ作業を組み込む実践。",
    "detail": "コードコミット時の SAST、PR 時の依存スキャン、デプロイ時の DAST など、セキュリティテストを CI/CD に常駐させて遅延無くフィードバックを返します。",
    "countermeasures": [
      "SAST / DAST / SCA を CI に組み込む",
      "脆弱性の SLA とオーナーを明確化",
      "セキュリティ教育を開発プロセスに組み込む"
    ],
    "no": 131
  },
  {
    "no": 61,
    "term": "DoS攻撃",
    "reading": "どすこうげき",
    "summary": "大量の負荷を与えてサービスを停止させる攻撃。",
    "detail": "サーバへ大量の通信や処理要求を送り付け、正常利用者がアクセスできない状態にします。",
    "countermeasures": [
      "レート制限",
      "WAF導入",
      "CDN利用"
    ]
  },
  {
    "no": 40,
    "term": "特権アクセス管理",
    "reading": "PAM）（とっけんあくせすかんり",
    "summary": "管理者権限を安全に管理する仕組み。",
    "detail": "高権限アカウントを厳格に管理し、不正利用や内部不正を防止します。",
    "countermeasures": [
      "特権ID分離",
      "操作ログ取得",
      "承認フロー導入"
    ]
  },
  {
    "term": "DOM-based XSS",
    "reading": "DOM-XSS）（どむべーすどえっくすえすえす",
    "summary": "サーバを介さずクライアント JS だけで成立する XSS。",
    "detail": "URL 断片や document.referrer などをクライアント側 JavaScript が innerHTML に渡すと発生します。サーバ側のエスケープでは防げないため、シンク側の検証が必要です。",
    "countermeasures": [
      "innerHTML / eval を避け textContent を使う",
      "DOMPurify などのサニタイザを通す",
      "Trusted Types を有効化"
    ],
    "no": 106
  },
  {
    "no": 43,
    "term": "トロイの木馬",
    "reading": "とろいのもくば",
    "summary": "正常なソフトを装うマルウェア。",
    "detail": "ゲームや便利ツールに見せかけて利用者に実行させ、裏で不正活動を行います。",
    "countermeasures": [
      "公式サイトからのみ入手",
      "電子署名確認"
    ]
  },
  {
    "no": 55,
    "term": "Dropper",
    "reading": "どろっぱー",
    "summary": "他のマルウェアを運ぶためのプログラム。",
    "detail": "自身は無害に見えますが、本体マルウェアをダウンロードして実行します。",
    "countermeasures": [
      "実行ファイル監視",
      "EDR利用"
    ]
  },
  {
    "no": 34,
    "term": "なりすまし",
    "reading": "なりすまし",
    "summary": "他人の身元を偽る攻撃。",
    "detail": "盗まれた認証情報などを利用して正規ユーザーとして振る舞います。",
    "countermeasures": [
      "MFA",
      "ログ監視"
    ]
  },
  {
    "no": 33,
    "term": "認可不備",
    "reading": "にんかふび",
    "summary": "権限チェック不足による脆弱性。",
    "detail": "ログインしていてもアクセス権がない機能を利用できてしまう状態です。",
    "countermeasures": [
      "サーバ側認可チェック"
    ]
  },
  {
    "no": 69,
    "term": "Packet Sniffing",
    "reading": "ぱけっとすにっふぃんぐ",
    "summary": "通信内容を盗み見る行為。",
    "detail": "ネットワーク上のパケットを収集して情報を取得します。",
    "countermeasures": [
      "TLS利用",
      "VPN利用"
    ]
  },
  {
    "no": 22,
    "term": "パスワードスプレー攻撃",
    "reading": "ぱすわーどすぷれーこうげき",
    "summary": "少数の有名パスワードを大量のアカウントへ試す攻撃。",
    "detail": "「Password123」などよく使われるパスワードを多数のユーザーに対して試します。",
    "countermeasures": [
      "MFA導入",
      "弱いパスワード禁止",
      "ログ監視"
    ]
  },
  {
    "no": 51,
    "term": "Backdoor",
    "reading": "ばっくどあ",
    "summary": "秘密の侵入口を作るマルウェア。",
    "detail": "攻撃者が後から自由に侵入できるようにします。",
    "countermeasures": [
      "不審通信監視",
      "定期調査"
    ]
  },
  {
    "no": 77,
    "term": "ハッシュ関数",
    "reading": "はっしゅかんすう",
    "summary": "データを固定長の値へ変換する関数。",
    "detail": "元のデータへ戻すことが極めて困難なため、パスワード管理などで利用されます。",
    "countermeasures": [
      "SHA-256以上利用",
      "ソルト追加"
    ]
  },
  {
    "term": "Honey Pot",
    "reading": "はにーぽっと",
    "summary": "攻撃者を誘い込むためのおとりシステム。",
    "detail": "本物そっくりだが本番でないサーバを設置し、攻撃手口の情報収集や、本物サーバへの攻撃検知に使います。",
    "countermeasures": [
      "本番ネットワークから隔離して設置",
      "ログ収集パイプラインを冗長化",
      "おとりであることを利用規約で明示"
    ],
    "no": 128
  },
  {
    "no": 18,
    "term": "パラメータポリューション",
    "reading": "ぱらめーたぽりゅーしょん",
    "summary": "同名パラメータを悪用する攻撃。",
    "detail": "複数の同名パラメータを送信し、アプリの想定外動作を引き起こします。",
    "countermeasures": [
      "パラメータ重複禁止"
    ]
  },
  {
    "no": 58,
    "term": "Banker",
    "reading": "ばんかー",
    "summary": "金融情報窃取を目的としたマルウェア。",
    "detail": "ネットバンキングの認証情報や口座情報を盗みます。",
    "countermeasures": [
      "MFA",
      "金融サイト監視"
    ]
  },
  {
    "term": "bcrypt",
    "reading": "びーくりぷと",
    "summary": "意図的に重く設計されたパスワード専用のハッシュアルゴリズム。",
    "detail": "計算コスト (cost factor) を指定でき、ハードウェアの進化に合わせて引き上げられます。総当たり攻撃を時間的に高コストにする目的で設計されました。",
    "countermeasures": [
      "cost を 10〜12 以上に設定",
      "pepper を別途環境変数で持つ",
      "より新しい Argon2id も選択肢"
    ],
    "no": 117
  },
  {
    "term": "PKCE",
    "reading": "PKCE）（ぴーけーしーいー",
    "summary": "OAuth 認可コードの横取りを防ぐためのチャレンジ拡張。",
    "detail": "ネイティブアプリ等の公開クライアントで、code_verifier と code_challenge を組み合わせ、横取りされたコードを攻撃者が交換できないようにします。",
    "countermeasures": [
      "公開クライアントでは必ず PKCE を使用",
      "method は S256 を選択",
      "code_verifier に十分な乱数を使用"
    ],
    "no": 120
  },
  {
    "no": 73,
    "term": "BGP Hijacking",
    "reading": "びーじーぴーはいじゃっく",
    "summary": "インターネット経路を乗っ取る攻撃。",
    "detail": "BGP経路情報を偽装し、本来とは異なる経路へ通信を誘導します。",
    "countermeasures": [
      "RPKI導入",
      "経路監視"
    ]
  },
  {
    "no": 38,
    "term": "ビジネスメール詐欺",
    "reading": "BEC）（びじねすめーるさぎ",
    "summary": "経営者などを装って送金させる詐欺。",
    "detail": "社長や取引先を偽装し、従業員へ不正送金を指示します。",
    "countermeasures": [
      "多段階承認",
      "電話確認"
    ]
  },
  {
    "no": 64,
    "term": "Ping Flood",
    "reading": "ぴんぐふらっど",
    "summary": "大量のPingを送り付ける攻撃。",
    "detail": "ICMPパケットを大量送信し、ネットワークやサーバへ負荷をかけます。",
    "countermeasures": [
      "ICMP制限",
      "ファイアウォール設定"
    ]
  },
  {
    "no": 9,
    "term": "ファイルインクルージョン",
    "reading": "ふぁいるいんくるーじょん",
    "summary": "任意のファイルを読み込ませる攻撃。",
    "detail": "PHPなどで外部ファイルを読み込む機能を悪用し、不正なコードを実行させます。",
    "countermeasures": [
      "ファイル名固定",
      "外部URL読込禁止"
    ]
  },
  {
    "no": 52,
    "term": "Fileless Malware",
    "reading": "ふぁいるれすまるうぇあ",
    "summary": "ファイルを残さず活動するマルウェア。",
    "detail": "メモリ上で動作するため従来型アンチウイルスを回避しやすい特徴があります。",
    "countermeasures": [
      "EDR導入",
      "PowerShell監視"
    ]
  },
  {
    "no": 36,
    "term": "フィッシング",
    "reading": "ふぃっしんぐ",
    "summary": "偽サイトで情報を盗む攻撃。",
    "detail": "銀行や有名サービスを装い、認証情報を入力させます。",
    "countermeasures": [
      "URL確認",
      "MFA導入",
      "セキュリティ教育"
    ]
  },
  {
    "no": 74,
    "term": "VPN",
    "reading": "ぶいぴーえぬ",
    "summary": "安全な仮想専用通信網。",
    "detail": "インターネット上に暗号化されたトンネルを作り、安全な通信を実現します。",
    "countermeasures": [
      "強力な暗号方式利用",
      "MFA導入"
    ]
  },
  {
    "no": 99,
    "term": "フォレンジック",
    "reading": "ふぉれんじっく",
    "summary": "事故後の証拠保全・調査。",
    "detail": "侵入経路や被害範囲を特定するため、ログやメモリ、ディスクを解析します。",
    "countermeasures": [
      "ログ保全",
      "証拠保管手順整備"
    ]
  },
  {
    "term": "Blind SQL Injection",
    "reading": "ぶらいんどえすきゅーえるいんじぇくしょん",
    "summary": "レスポンスに直接結果が出ない条件で行う SQL インジェクション。",
    "detail": "サーバが正常/エラーの違いやレスポンス時間だけを返す場合に、条件式や SLEEP 関数の真偽でデータベース内容を 1 ビットずつ復元します。",
    "countermeasures": [
      "プリペアドステートメントの徹底",
      "DB エラーをクライアントに返さない",
      "WAF やリクエストレート監視"
    ],
    "no": 109
  },
  {
    "no": 21,
    "term": "ブルートフォース攻撃",
    "reading": "ぶるーとふぉーすこうげき",
    "summary": "パスワードを総当たりで試す攻撃。",
    "detail": "攻撃者が可能なパスワードを片っ端から試してログインを狙う手法です。単純なパスワードほど突破されやすくなります。",
    "countermeasures": [
      "アカウントロック",
      "MFA導入",
      "強力なパスワードポリシー"
    ]
  },
  {
    "no": 14,
    "term": "Broken Access Control",
    "reading": "ぶろーくんあくせすこんとろーる",
    "summary": "アクセス制御不備による情報漏えい。",
    "detail": "権限確認が不足しているため、一般ユーザーが管理者機能へアクセスできる状態です。",
    "countermeasures": [
      "サーバ側権限チェック"
    ]
  },
  {
    "no": 19,
    "term": "プロトタイプポリューション",
    "reading": "ぷろとたいぷぽりゅーしょん",
    "summary": "JavaScriptのプロトタイプを汚染する攻撃。",
    "detail": "オブジェクトの継承元を書き換え、アプリ全体の動作を改変します。",
    "countermeasures": [
      "ライブラリ更新",
      "危険キー拒否"
    ]
  },
  {
    "no": 91,
    "term": "ペネトレーションテスト",
    "reading": "ぺねとれーしょんてすと",
    "summary": "実際に攻撃して安全性を確認するテスト。",
    "detail": "攻撃者視点で侵入を試み、どこまで被害が拡大するかを調査します。",
    "countermeasures": [
      "定期実施",
      "結果の改善反映"
    ]
  },
  {
    "no": 48,
    "term": "ボット",
    "reading": "ぼっと",
    "summary": "攻撃者の命令で動く感染端末。",
    "detail": "感染した端末は遠隔操作され、攻撃に利用されます。",
    "countermeasures": [
      "感染端末の隔離",
      "EDR利用"
    ]
  },
  {
    "no": 49,
    "term": "ボットネット",
    "reading": "ぼっとねっと",
    "summary": "大量のボットで構成されたネットワーク。",
    "detail": "数万〜数百万台の感染端末を利用してDDoS攻撃などを行います。",
    "countermeasures": [
      "感染防止",
      "通信監視"
    ]
  },
  {
    "term": "MITRE ATT&CK",
    "reading": "MITRE）（まいたーあたっく",
    "summary": "実世界の攻撃者の戦術と技術を体系化したナレッジベース。",
    "detail": "Initial Access / Execution / Persistence などのフェーズと、具体的テクニックの組合せでアクター挙動をマッピングします。検知ルール設計や Red/Blue 演習で活用されます。",
    "countermeasures": [
      "検知ルールを ATT&CK ID で管理",
      "ギャップ分析でカバレッジを可視化",
      "Red Team 演習のシナリオ作成に活用"
    ],
    "no": 125
  },
  {
    "term": "Mass Assignment",
    "reading": "ますあさいんめんと",
    "summary": "リクエストの値をモデルに一括代入することで権限項目まで上書きされる脆弱性。",
    "detail": "ORM の update(req.body) のような書き方で、フォームに無い is_admin などの内部項目まで攻撃者に書き換えられます。",
    "countermeasures": [
      "許可項目のホワイトリスト (permit) を明示",
      "is_admin など内部項目は別パスで更新",
      "DTO を介してフィールドを絞る"
    ],
    "no": 111
  },
  {
    "no": 68,
    "term": "Man in the Middle Attack",
    "reading": "MITM）（まんいんざみどるあたっく",
    "summary": "通信の途中に割り込む攻撃。",
    "detail": "攻撃者が通信経路へ介入し、盗聴や改ざんを行います。",
    "countermeasures": [
      "TLS利用",
      "証明書検証"
    ]
  },
  {
    "term": "Mixed Content",
    "reading": "みっくすどこんてんつ",
    "summary": "HTTPS ページから HTTP リソースを読み込んでしまう状態。",
    "detail": "HTTPS の安全性を、画像や script の HTTP 読み込みが壊します。アクティブ Mixed Content (script/iframe) はブラウザが既定でブロックしますが、それでも警告が出ます。",
    "countermeasures": [
      "全リソースを HTTPS で配信",
      "プロトコル相対 URL を避け絶対 https:// を使う",
      "upgrade-insecure-requests を CSP で指定"
    ],
    "no": 113
  },
  {
    "no": 57,
    "term": "RAT",
    "reading": "らっと",
    "summary": "遠隔操作型マルウェア。",
    "detail": "Remote Access Trojanの略。攻撃者が被害端末を自由に操作できます。",
    "countermeasures": [
      "EDR",
      "通信ログ監視"
    ]
  },
  {
    "no": 44,
    "term": "ランサムウェア",
    "reading": "らんさむうぇあ",
    "summary": "データを人質にして金銭を要求するマルウェア。",
    "detail": "ファイルを暗号化し、「復号したければ身代金を払え」と要求します。",
    "countermeasures": [
      "定期バックアップ",
      "EDR導入",
      "メール添付注意"
    ]
  },
  {
    "term": "Least Privilege",
    "reading": "りーすとぷりびれっじ",
    "summary": "ユーザ・プロセスに必要最小限の権限だけを与える原則。",
    "detail": "管理者権限の常用を避け、操作の都度に必要な権限へ昇格 (sudo / IAM Role 切替) します。漏えい時の被害範囲を限定するための基本原則です。",
    "countermeasures": [
      "デフォルト deny で設計",
      "ロールベースアクセス制御 (RBAC) を採用",
      "定期的に未使用権限を棚卸し"
    ],
    "no": 127
  },
  {
    "no": 35,
    "term": "リプレイ攻撃",
    "reading": "りぷれいこうげき",
    "summary": "通信内容を再送して悪用する攻撃。",
    "detail": "正規の認証通信を盗聴し、そのまま再送することで認証突破を狙います。",
    "countermeasures": [
      "ノンス利用",
      "タイムスタンプ検証"
    ]
  },
  {
    "term": "Reflected XSS",
    "reading": "りふれくてっどえっくすえすえす",
    "summary": "URL 等の入力がレスポンスにそのまま埋め込まれて発火する XSS。",
    "detail": "サーバが URL パラメータをエスケープせず HTML に書き戻すことで、攻撃者が用意したリンクを踏ませた被害者のブラウザで JS を実行できます。",
    "countermeasures": [
      "出力時に文脈に応じてエスケープ",
      "Content-Type と charset を明示",
      "CSP を併用"
    ],
    "no": 107
  },
  {
    "term": "Refresh Token",
    "reading": "りふれっしゅとーくん",
    "summary": "アクセストークンを再発行するための長寿命トークン。",
    "detail": "アクセストークンを短命にして安全性を高める代わりに、Refresh Token で再発行します。漏えい時の影響が大きいので保管と回転 (rotation) の設計が重要です。",
    "countermeasures": [
      "Refresh Token Rotation を有効化",
      "再利用検知時に全失効",
      "HttpOnly Secure Cookie に保存"
    ],
    "no": 121
  },
  {
    "no": 50,
    "term": "Rootkit",
    "reading": "るーときっと",
    "summary": "自身の存在を隠すマルウェア。",
    "detail": "OSの深い部分へ侵入し、検知されないように活動します。",
    "countermeasures": [
      "OS再インストール",
      "Secure Boot利用"
    ]
  },
  {
    "term": "Race Condition (TOCTOU)",
    "reading": "れーすこんでぃしょん",
    "summary": "チェックと使用の間で状態が変わることを突く脆弱性。",
    "detail": "残高チェックの直後に同時並行で送金が走ると、両方が「残高あり」と判断し二重出金が起こる、という類のバグ。Time-of-check to time-of-use (TOCTOU) とも呼ばれます。",
    "countermeasures": [
      "DB トランザクション + 行ロック (SELECT FOR UPDATE)",
      "アプリ層で冪等キーを使う",
      "重要操作は原子的な単一クエリで表現"
    ],
    "no": 112
  },
  {
    "no": 71,
    "term": "Rogue AP",
    "reading": "ろーぐえーぴー",
    "summary": "不正なアクセスポイント。",
    "detail": "攻撃者や内部関係者が勝手に設置した無線LAN機器です。",
    "countermeasures": [
      "無線LAN監視",
      "NAC導入"
    ]
  },
  {
    "no": 98,
    "term": "ログ監視",
    "reading": "ろぐかんし",
    "summary": "ログから異常を発見する活動。",
    "detail": "認証失敗や不審な通信を分析し、攻撃の早期発見につなげます。",
    "countermeasures": [
      "SIEM導入",
      "アラート整備"
    ]
  },
  {
    "no": 54,
    "term": "Logic Bomb",
    "reading": "ろじっくぼむ",
    "summary": "特定条件で発動する悪意あるコード。",
    "detail": "退職日や特定日時になるとデータ削除などを実行します。",
    "countermeasures": [
      "ソースコードレビュー",
      "権限管理"
    ]
  },
  {
    "no": 60,
    "term": "Wormable Vulnerability",
    "reading": "わーまぶるばるなびりてぃ",
    "summary": "ワームによる自動感染が可能な脆弱性。",
    "detail": "感染した端末が次々と他の端末へ攻撃を広げられる脆弱性です。WannaCryで悪用されたSMB脆弱性が有名です。",
    "countermeasures": [
      "迅速なパッチ適用",
      "ネットワーク分離"
    ]
  },
  {
    "no": 42,
    "term": "ワーム",
    "reading": "わーむ",
    "summary": "自力で感染を拡大するマルウェア。",
    "detail": "ウイルスと異なり他のプログラムに寄生せず、ネットワークを通じて自動的に感染を広げます。",
    "countermeasures": [
      "セキュリティパッチ適用",
      "ファイアウォール利用"
    ]
  },
  {
    "no": 81,
    "term": "WAF",
    "reading": "わふ",
    "summary": "Webアプリを攻撃から守る防御装置。",
    "detail": "Web Application Firewallの略。HTTP通信を監視し、SQLインジェクションやXSSなどの攻撃パターンを検知・遮断します。",
    "countermeasures": [
      "シグネチャ更新",
      "誤検知チューニング"
    ]
  },
  {
    "no": 25,
    "term": "ワンタイムパスワード",
    "reading": "OTP）（わんたいむぱすわーど",
    "summary": "一度だけ利用できるパスワード。",
    "detail": "短時間で失効するため、パスワード漏えい時のリスクを軽減できます。",
    "countermeasures": [
      "認証アプリ利用",
      "利用期限設定"
    ]
  }
];
