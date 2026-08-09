# =====================================================================
# InfraField v0.4 - Script de Coleta Automática Avançada (Hardware WMI)
# Captura Hostname, IP, CPU, RAM, OS, Marca e Modelo do Windows
# =====================================================================

$ErrorActionPreference = "Continue"

# Servidor InfraField Web (Altere IP/Porta se necessário)
$serverHost = "localhost"
$serverPort = "5173"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  INFRAFIELD - ONBOARDING AVANÇADO DE HARDWARE       " -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Capturar Hostname
$hostname = $env:COMPUTERNAME
if (-not $hostname) {
    $hostname = [System.Net.Dns]::GetHostName()
}

# 2. Capturar Endereço IP IPv4 Ativo
$ip = $null
try {
    $netIP = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | 
        Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | 
        Select-Object -First 1
    if ($netIP) { $ip = $netIP.IPAddress }
} catch {}

if (-not $ip) {
    try {
        $ip = ([System.Net.Dns]::GetHostAddresses($hostname) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1).IPAddressToString
    } catch {
        $ip = "127.0.0.1"
    }
}

# 3. Capturar Hardware via WMI / CIM
$cpu = "N/A"
$ram = "N/A"
$os  = "N/A"
$brand = "N/A"
$model = "N/A"

try {
    $proc = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($proc -and $proc.Name) {
        $cpu = $proc.Name.Trim()
    }
} catch {}

try {
    $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cs) {
        if ($cs.TotalPhysicalMemory) {
            $ramGB = [math]::Round($cs.TotalPhysicalMemory / 1GB)
            $ram = "$ramGB GB"
        }
        if ($cs.Manufacturer) { $brand = $cs.Manufacturer.Trim() }
        if ($cs.Model) { $model = $cs.Model.Trim() }
    }
} catch {}

try {
    $osInstance = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($osInstance -and $osInstance.Caption) {
        $os = $osInstance.Caption.Trim()
    }
} catch {}

# 4. Encodar parâmetros para a URL
$encodedHost  = [System.Uri]::EscapeDataString($hostname)
$encodedIp    = [System.Uri]::EscapeDataString($ip)
$encodedCpu   = [System.Uri]::EscapeDataString($cpu)
$encodedRam   = [System.Uri]::EscapeDataString($ram)
$encodedOs    = [System.Uri]::EscapeDataString($os)
$encodedBrand = [System.Uri]::EscapeDataString($brand)
$encodedModel = [System.Uri]::EscapeDataString($model)

$targetUrl = "http://${serverHost}:${serverPort}/onboard?host=${encodedHost}&ip=${encodedIp}&cpu=${encodedCpu}&ram=${encodedRam}&os=${encodedOs}&brand=${encodedBrand}&model=${encodedModel}"

Write-Host " [+] Hostname detectado : $hostname" -ForegroundColor Green
Write-Host " [+] IP IPv4 detectado  : $ip" -ForegroundColor Green
Write-Host " [+] Processador (CPU)  : $cpu" -ForegroundColor Cyan
Write-Host " [+] Memória RAM        : $ram" -ForegroundColor Cyan
Write-Host " [+] Sistema Operacional: $os" -ForegroundColor Cyan
Write-Host " [+] Marca / Fabricante : $brand" -ForegroundColor Magenta
Write-Host " [+] Modelo              : $model" -ForegroundColor Magenta
Write-Host "-----------------------------------------------------" -ForegroundColor Gray
Write-Host " Abrindo o formulário de Onboarding no navegador..." -ForegroundColor Cyan

# Abrir no Navegador Padrão do Windows
Start-Process $targetUrl

Write-Host "✅ Coleta concluída com sucesso! Conclua o cadastro na janela aberta." -ForegroundColor Yellow
