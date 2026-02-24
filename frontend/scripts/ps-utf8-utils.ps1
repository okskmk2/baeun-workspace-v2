Set-StrictMode -Version Latest

function Get-Utf8NoBomEncoding {
  return [System.Text.UTF8Encoding]::new($false, $true)
}

function Read-Utf8Text {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $encoding = Get-Utf8NoBomEncoding
  return [System.IO.File]::ReadAllText($Path, $encoding)
}

function Write-Utf8Text {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Content
  )

  $encoding = Get-Utf8NoBomEncoding
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Replace-Utf8Text {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$Pattern,

    [Parameter(Mandatory = $true)]
    [string]$Replacement,

    [switch]$Regex
  )

  $original = Read-Utf8Text -Path $Path
  $updated = if ($Regex) {
    [regex]::Replace($original, $Pattern, $Replacement)
  } else {
    $original.Replace($Pattern, $Replacement)
  }

  if ($updated -ne $original) {
    Write-Utf8Text -Path $Path -Content $updated
    return $true
  }

  return $false
}

