# License Admin Tool - Python

This folder contains the Python-based admin tool used to manage license keys for the Modular World Generator.

The tool provides a simple Tkinter GUI that communicates with the Supabase `key-management` Edge Function.

## Features

- Generate new license keys manually
- Automatically generate keys when the available key pool is low
- View license statistics
- Display generated keys in the GUI log
- Communicate with the Supabase backend through an Edge Function

## Folder Structure

```txt
LicenseAdminTool - Python/
├── Scripts/
│   └── license_admin_tool.py
├── .env.example
├── requirements.txt
├── README.md
└── UnityLicenseAdmin.spec
```

## Requirements

- Python 3.10+
- `requests`
- `python-dotenv`
- Tkinter, included with most standard Python installations

Install dependencies with:

```bash
pip install -r requirements.txt
```

## Environment Configuration

The real Supabase URL and publishable key are not hardcoded in the Python script.

Create a local `.env` file in the root of this folder:

```txt
LicenseAdminTool - Python/.env
```

Use `.env.example` as a template.

Example:

```env
SUPABASE_KEY_MANAGEMENT_URL=https://your-project-ref.supabase.co/functions/v1/key-management
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Do not commit the real `.env` file.

The repository should only include:

```txt
.env.example
```

The real `.env` file is ignored by Git.

## Running the Tool

From inside the Python folder, run:

```bash
python Scripts/license_admin_tool.py
```

When the GUI opens:

1. Enter your admin secret key.
2. Click `Get License Statistics` to test the connection.
3. Use `Generate Keys Manually` or `Auto-Generate Keys` to manage license keys.

## Admin Secret

The admin secret is not stored in the Python project.

It is entered manually in the GUI and sent to the Supabase `key-management` function.

The Supabase function compares it against the `ADMIN_SECRET` value configured in Supabase Edge Function secrets.

## Security Notes

The Python tool should only use:

```txt
Supabase key-management function URL
Supabase publishable key
Admin secret entered manually by the admin
```

The Python tool should never contain:

```txt
Supabase secret key
Service role key
Database password
Real production secrets
```

The Supabase secret key is used only inside Supabase Edge Functions.

## PyInstaller Spec File

`UnityLicenseAdmin.spec` is a PyInstaller configuration file.

It can be used to build the Python admin tool into a standalone executable.

If you plan to distribute the admin tool as an `.exe`, keep this file in the repository.

If you do not plan to build an executable, you can remove it from Git tracking and ignore it.
