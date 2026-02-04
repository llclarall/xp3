cd 'c:\wamp64\www\xp3\images'

# Télécharger les images PNG depuis OpenMoji
$emojiMap = @(
    @{emoji='🪵'; name='wood'; unicode='1fab5'},
    @{emoji='🪨'; name='rock'; unicode='1fab8'},
    @{emoji='🌲'; name='tree'; unicode='1f332'},
    @{emoji='🦴'; name='bone'; unicode='1f9b4'},
    @{emoji='🔥'; name='fire'; unicode='1f525'},
    @{emoji='🦣'; name='mammoth'; unicode='1f9a3'},
    @{emoji='🏺'; name='amphora'; unicode='1f3fa'},
    @{emoji='🌴'; name='palm-tree'; unicode='1f334'},
    @{emoji='🐪'; name='camel'; unicode='1f42a'},
    @{emoji='⚱️'; name='urn'; unicode='26b1'},
    @{emoji='📜'; name='scroll'; unicode='1f4dc'},
    @{emoji='🗿'; name='moai'; unicode='1f5ff'},
    @{emoji='🏛️'; name='building'; unicode='1f3db'},
    @{emoji='🌳'; name='deciduous-tree'; unicode='1f333'},
    @{emoji='⚔️'; name='swords'; unicode='2694'},
    @{emoji='🏰'; name='castle'; unicode='1f3f0'},
    @{emoji='🏇'; name='horse'; unicode='1f3c7'},
    @{emoji='🛡️'; name='shield'; unicode='1f6e1'},
    @{emoji='📖'; name='book'; unicode='1f4d6'},
    @{emoji='🎨'; name='palette'; unicode='1f3a8'},
    @{emoji='🔭'; name='telescope'; unicode='1f52d'},
    @{emoji='🎻'; name='violin'; unicode='1f3bb'},
    @{emoji='⛪'; name='church'; unicode='26ea'},
    @{emoji='🎭'; name='theater'; unicode='1f3ad'},
    @{emoji='⚙️'; name='gear'; unicode='2699'},
    @{emoji='🏭'; name='factory'; unicode='1f3ed'},
    @{emoji='🔩'; name='bolt'; unicode='1f529'},
    @{emoji='🚂'; name='train'; unicode='1f682'},
    @{emoji='🏬'; name='store'; unicode='1f3ec'},
    @{emoji='🚀'; name='rocket'; unicode='1f680'},
    @{emoji='💻'; name='computer'; unicode='1f4bb'},
    @{emoji='📱'; name='phone'; unicode='1f4f1'}
)

foreach ($item in $emojiMap) {
    $url = "https://cdn.jsdelivr.net/npm/openmoji-72/color/$($item.unicode).png"
    $filename = "$($item.name).png"
    Write-Host "Downloading $($item.emoji) -> $filename"
    try {
        Invoke-WebRequest -Uri $url -OutFile $filename -UseBasicParsing
        Write-Host "OK: $filename"
    } catch {
        Write-Host "ERROR downloading $filename"
    }
    Start-Sleep -Milliseconds 200
}

Write-Host "Done!"
