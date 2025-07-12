# Check if running as Administrator
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Please run PowerShell as Administrator"
    exit 1
}

# Function to check if a command exists
function Test-CommandExists {
    param($command)
    return [bool](Get-Command $command -ErrorAction SilentlyContinue)
}

# 1. Install Node.js if not installed
if (-not (Test-CommandExists "node")) {
    Write-Host "Installing Node.js 18 LTS..."
    $nodeUrl = "https://nodejs.org/dist/v18.18.2/node-v18.18.2-x64.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile "node.msi"
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i node.msi /quiet" -Wait
    Remove-Item "node.msi"
    Write-Host "Node.js installed successfully"
} else {
    Write-Host "Node.js is already installed"
}

# 2. Install Git if not installed
if (-not (Test-CommandExists "git")) {
    Write-Host "Installing Git..."
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
    Invoke-WebRequest -Uri $gitUrl -OutFile "git.exe"
    Start-Process -FilePath "git.exe" -ArgumentList "/SILENT /NORESTART" -Wait
    Remove-Item "git.exe"
    Write-Host "Git installed successfully"
} else {
    Write-Host "Git is already installed"
}

# 3. Install Supabase CLI
Write-Host "Installing Supabase CLI..."
npm install -g supabase

# 4. Login to Supabase
Write-Host "Please login to Supabase (you'll need to enter your credentials)"
supabase login

# 5. Configure Git (if not already configured)
$gitConfig = git config --list
if ($gitConfig -notmatch "user.name") {
    Write-Host "Please configure your Git username:"
    $gitUsername = Read-Host "Enter your Git username"
    git config --global user.name "$gitUsername"
}

if ($gitConfig -notmatch "user.email") {
    Write-Host "Please configure your Git email:"
    $gitEmail = Read-Host "Enter your Git email"
    git config --global user.email "$gitEmail"
}

# 6. Create Vercel account (manual step)
Write-Host "`nPlease create a Vercel account at https://vercel.com/signup if you haven't already.`n"

Write-Host "All prerequisites have been installed! You can now proceed with the Supabase project setup."
