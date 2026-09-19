$map = @{
  '150' = '1.16'; '200' = '1.54'; '250' = '1.93'; '300' = '2.32';
  '400' = '3.09'; '500' = '3.86'; '600' = '4.63'; '800' = '6.18';
  '900' = '6.95'; '1,000' = '7.72'; '1,200' = '9.26'; '1,800' = '13.90';
  '2,000' = '15.44'; '5,000' = '38.60'; '6,000' = '46.32';
  '8,000' = '61.75'; '10,000' = '77.20'; '15,000' = '115.77';
  '20,000' = '154.35'; '25,000' = '193.00'; '40,000' = '308.80';
  '50,000' = '386.00'; '80,000' = '617.50'; '100,000' = '772.00';
  '160,000' = '1235.20'
}

$root = 'C:\Users\katun\Desktop\video-creator-app\src'
$files = Get-ChildItem $root -Recurse -Include *.jsx,*.js
$total = 0

foreach ($f in $files) {
    $c = [IO.File]::ReadAllText($f.FullName)
    $orig = $c

    # Pass A: KES X (about $Y) -> placeholder
    $c = [regex]::Replace($c, 'KES (\d[\d,]*)\s*\(about \$([\d.,]+)\)', 'FLIPPH_$2_ABK_$1')

    # Pass B: KES X -> $Y (KES X)
    foreach ($kes in $map.Keys) {
        $usd = $map[$kes]
        $c = $c.Replace('KES ' + $kes, '$' + $usd + ' (KES ' + $kes + ')')
    }

    # Pass C: unwrap placeholders
    $c = [regex]::Replace($c, 'FLIPPH_([\d.,]+)_ABK_([\d,]+)', '$1 (KES $2)')

    if ($c -ne $orig) {
        [IO.File]::WriteAllText($f.FullName, $c, [Text.UTF8Encoding]::new($false))
        Write-Host ('Updated: ' + $f.Name)
        $total++
    }
}

Write-Host ('Total files updated: ' + $total)