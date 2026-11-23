param([string]$List)
# Windows'un yerleşik Türkçe sesiyle metinleri çevrimdışı seslendirir. Liste: her satır "çıktı.wav<TAB>metin".
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Wait-Op($op, [Type]$type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(); $t.Result }
$s = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.Language -eq 'tr-TR' } | Select-Object -First 1
if (-not $voice) { throw 'Turkce ses yok' }
$s.Voice = $voice
$s.Options.SpeakingRate = 1.02
foreach ($line in [IO.File]::ReadAllLines($List, [Text.Encoding]::UTF8)) {
  $parts = $line -split "`t", 2
  if ($parts.Count -ne 2 -or (Test-Path $parts[0])) { continue }
  $stream = Wait-Op ($s.SynthesizeTextToStreamAsync($parts[1])) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  [void](Wait-Op ($reader.LoadAsync([uint32]$stream.Size)) ([uint32]))
  $bytes = New-Object byte[] ([int]$stream.Size)
  $reader.ReadBytes($bytes)
  [IO.File]::WriteAllBytes($parts[0], $bytes)
}
