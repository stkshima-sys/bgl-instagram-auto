# token_input.txt を入力ダイアログで作成するスクリプト（値はチャットに出ない）
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Windows.Forms

$items = @(
  @{ key = "APP_ID";           title = "1/5  APP_ID";           msg = "MetaアプリID（15〜16桁の数字）を貼り付けてください`n（developers.facebook.com → draft-sns-auto → アプリ設定 → ベーシック）" },
  @{ key = "APP_SECRET";       title = "2/5  APP_SECRET";       msg = "app secret（アプリシークレット）を貼り付けてください`n（同じ画面で「表示」を押すと見えます）" },
  @{ key = "SHORT_TOKEN";      title = "3/5  SHORT_TOKEN";      msg = "グラフAPIエクスプローラの「アクセストークン」欄の`nEAAで始まる長い文字列を貼り付けてください`n（2時間で失効。古い場合はGenerate Access Tokenで取り直してから）" },
  @{ key = "OPENAI_API_KEY";   title = "4/5  OPENAI_API_KEY";   msg = "OpenAIのAPIキー（sk-で始まる）を貼り付けてください`n（スキップする場合は空のままOK）" },
  @{ key = "GOOGLE_SHEETS_ID"; title = "5/5  GOOGLE_SHEETS_ID"; msg = "BGL専用スプレッドシートのIDを貼り付けてください`n（URLの /d/ と /edit の間の文字列。スキップする場合は空のままOK）" }
)

$lines = @()
foreach ($it in $items) {
  $v = [Microsoft.VisualBasic.Interaction]::InputBox($it.msg, $it.title, "")
  $lines += "$($it.key)=$($v.Trim())"
}
$lines += "SERVICE_ACCOUNT_JSON_PATH=C:\Users\t_pop\OneDrive\デスクトップ\Draftアプリ\Threads自動投稿\service_account.json"

$out = "C:\Users\t_pop\OneDrive\デスクトップ\Draftアプリ\BaseballGirlsLIFE自動投稿\token_input.txt"
Set-Content -Path $out -Value ($lines -join "`r`n") -Encoding utf8

[System.Windows.Forms.MessageBox]::Show("保存しました。チャットに戻って「OK」と伝えてください。", "完了") | Out-Null
