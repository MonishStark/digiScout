# Digital Scout - GCP Upload PowerShell Script
# This script uploads your application to the GCP VM

$ErrorActionPreference = "Continue"

# VM Details
$VM_NAME = "instance-20260512-072402"
$VM_ZONE = "us-central1-a"
$VM_IP = "34.134.50.99"
$VM_USER = "ubuntu"
$REMOTE_PATH = "/opt/digitalscout/"
$SOURCE_DIR = "c:\Users\Dhanush\Downloads\zip"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIGITAL SCOUT - GCP UPLOAD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "VM:           $VM_NAME"
Write-Host "Zone:         $VM_ZONE"
Write-Host "IP:           $VM_IP"
Write-Host "Source:       $SOURCE_DIR"
Write-Host "Destination:  $REMOTE_PATH"
Write-Host ""

# Method 1: Try gcloud
Write-Host "Checking for gcloud..." -ForegroundColor Yellow
$gcloud = Get-Command gcloud -ErrorAction SilentlyContinue

if ($gcloud) {
    Write-Host "✅ gcloud found! Using gcloud scp..." -ForegroundColor Green
    Write-Host ""
    
    & gcloud compute scp --recurse `
        --exclude='.git/*' `
        --exclude='node_modules/*' `
        --exclude='.env.local' `
        "$SOURCE_DIR\" $VM_NAME`:/opt/digitalscout/ `
        --zone=$VM_ZONE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Upload successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. SSH into VM:  gcloud compute ssh $VM_NAME --zone=$VM_ZONE"
        Write-Host "2. Navigate:     cd /opt/digitalscout"
        Write-Host "3. Deploy:       docker-compose up -d"
        Write-Host "4. Wait 60s for services to start"
        Write-Host "5. Check health: curl http://localhost/health"
        Write-Host ""
        exit 0
    }
}

# Method 2: Try SSH/SCP
Write-Host "Checking for SSH/SCP..." -ForegroundColor Yellow
$scp = Get-Command scp -ErrorAction SilentlyContinue

if ($scp) {
    Write-Host "✅ SSH/SCP found! Creating tar archive..." -ForegroundColor Green
    Write-Host ""
    
    Push-Location $SOURCE_DIR
    
    # Create tar archive
    Write-Host "Creating compressed archive..." -ForegroundColor Yellow
    & tar --exclude=.git --exclude=node_modules --exclude=.env.local `
        -czf digitalscout.tar.gz *.* src docker dist 2>$null
    
    if (Test-Path "digitalscout.tar.gz") {
        Write-Host "✅ Archive created ($(((Get-Item digitalscout.tar.gz).Length / 1MB).ToString('F2')) MB)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Uploading via SCP..." -ForegroundColor Yellow
        
        # Upload
        & scp -r digitalscout.tar.gz "${VM_USER}@${VM_IP}:${REMOTE_PATH}" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Upload successful!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Now SSH into your VM and extract:" -ForegroundColor Cyan
            Write-Host "  ssh ${VM_USER}@${VM_IP}"
            Write-Host "  cd $REMOTE_PATH"
            Write-Host "  tar -xzf digitalscout.tar.gz"
            Write-Host "  rm digitalscout.tar.gz"
            Write-Host "  docker-compose up -d"
            Write-Host ""
            
            Remove-Item "digitalscout.tar.gz" -Force
            Pop-Location
            exit 0
        }
    }
    
    Pop-Location
}

# Both methods failed
Write-Host ""
Write-Host "❌ Neither gcloud nor SSH/SCP found." -ForegroundColor Red
Write-Host ""
Write-Host "ALTERNATIVE METHODS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Install Google Cloud SDK" -ForegroundColor Cyan
Write-Host "  1. Download: https://cloud.google.com/sdk/docs/install-sdk#windows"
Write-Host "  2. Install and initialize: gcloud init"
Write-Host "  3. Re-run this script"
Write-Host ""
Write-Host "Option 2: Use GCP Console SSH (Recommended)" -ForegroundColor Cyan
Write-Host "  1. Open: https://console.cloud.google.com/"
Write-Host "  2. Compute Engine > VM Instances"
Write-Host "  3. Click SSH button for: $VM_NAME"
Write-Host "  4. Once connected, run:"
Write-Host "     sudo mkdir -p /opt/digitalscout && cd /opt/digitalscout"
Write-Host "  5. Upload files using browser file uploader"
Write-Host ""
Write-Host "Option 3: Use WinSCP (GUI FTP Tool)" -ForegroundColor Cyan
Write-Host "  1. Download: https://winscp.net/"
Write-Host "  2. Connect to: $VM_IP (SSH, port 22)"
Write-Host "  3. Drag & drop files to: /opt/digitalscout/"
Write-Host ""
Write-Host "Option 4: Manual ZIP Upload" -ForegroundColor Cyan
Write-Host "  1. Compress: $SOURCE_DIR to ZIP"
Write-Host "  2. SSH to VM via GCP Console"
Write-Host "  3. Upload ZIP via browser"
Write-Host "  4. unzip digitalscout.zip"
Write-Host ""

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
