import os
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import requests
import json
from datetime import datetime
import threading
from dotenv import load_dotenv


class LicenseAdminTool:
    def __init__(self):
        load_dotenv()

        self.root = tk.Tk()
        self.root.title("Unity Tool - License Admin Panel")
        self.root.geometry("800x600")
        self.root.resizable(True, True)

        # Configuration
        self.api_url = os.getenv("SUPABASE_KEY_MANAGEMENT_URL", "").strip()
        self.publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
        self.admin_key = ""

        self.setup_ui()
        self.validate_configuration_on_startup()

    def setup_ui(self):
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)

        # Title
        title_label = ttk.Label(main_frame, text="🔧 License Management Admin Tool",
                                font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))

        # Admin Key Section
        ttk.Label(main_frame, text="Admin Secret Key:", font=("Arial", 10, "bold")).grid(
            row=1, column=0, sticky=tk.W, pady=5)

        self.admin_key_entry = ttk.Entry(main_frame, show="*", width=30)
        self.admin_key_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=5, padx=(10, 0))
        self.admin_key_entry.bind('<Return>', lambda e: self.get_statistics())

        # Buttons Section
        button_frame = ttk.LabelFrame(main_frame, text="Actions", padding="10")
        button_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)
        button_frame.columnconfigure(0, weight=1)
        button_frame.columnconfigure(1, weight=1)

        # Statistics Button
        self.stats_btn = ttk.Button(button_frame, text="📊 Get License Statistics",
                                    command=self.get_statistics)
        self.stats_btn.grid(row=0, column=0, padx=5, pady=5, sticky=(tk.W, tk.E))

        # Auto Generate Button
        self.auto_gen_btn = ttk.Button(button_frame, text="🔄 Auto-Generate Keys (if needed)",
                                       command=self.auto_generate_keys)
        self.auto_gen_btn.grid(row=0, column=1, padx=5, pady=5, sticky=(tk.W, tk.E))

        # Manual Generation Section
        manual_frame = ttk.Frame(button_frame)
        manual_frame.grid(row=1, column=0, columnspan=2, pady=10, sticky=(tk.W, tk.E))
        manual_frame.columnconfigure(1, weight=1)

        ttk.Label(manual_frame, text="Keys to Generate:").grid(row=0, column=0, padx=5)

        self.key_count_var = tk.StringVar(value="5")
        key_count_spinbox = ttk.Spinbox(manual_frame, from_=1, to=50, width=10,
                                        textvariable=self.key_count_var)
        key_count_spinbox.grid(row=0, column=1, padx=5, sticky=tk.W)

        self.manual_gen_btn = ttk.Button(manual_frame, text="🔑 Generate Keys Manually",
                                         command=self.manual_generate_keys)
        self.manual_gen_btn.grid(row=0, column=2, padx=5, sticky=(tk.W, tk.E))

        # Results Section
        results_frame = ttk.LabelFrame(main_frame, text="Results & Logs", padding="10")
        results_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=10)
        results_frame.columnconfigure(0, weight=1)
        results_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(3, weight=1)

        # Text area for results
        self.results_text = scrolledtext.ScrolledText(results_frame, height=15, width=80)
        self.results_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Clear button
        clear_btn = ttk.Button(results_frame, text="🗑️ Clear Log", command=self.clear_log)
        clear_btn.grid(row=1, column=0, pady=5, sticky=tk.E)

        # Status bar
        self.status_var = tk.StringVar(value="Ready")
        status_bar = ttk.Label(main_frame, textvariable=self.status_var, relief=tk.SUNKEN)
        status_bar.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(10, 0))

        # Initial log message
        self.log_message("🚀 License Admin Tool started successfully!")
        self.log_message("📝 Enter your admin secret key and click 'Get License Statistics' to begin.")

    def validate_configuration_on_startup(self):
        missing = []

        if not self.api_url:
            missing.append("SUPABASE_KEY_MANAGEMENT_URL")

        if not self.publishable_key:
            missing.append("SUPABASE_PUBLISHABLE_KEY")

        if missing:
            self.log_message("⚠️ Missing configuration values:")
            for item in missing:
                self.log_message(f"   - {item}")

            self.log_message("Create a local .env file based on .env.example.")
            messagebox.showwarning(
                "Missing Configuration",
                "Missing values in .env:\n\n" + "\n".join(missing)
            )
        else:
            self.log_message("✅ Supabase configuration loaded from .env")

    def log_message(self, message):
        """Add a timestamped message to the results area"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        formatted_message = f"[{timestamp}] {message}\n"

        self.results_text.insert(tk.END, formatted_message)
        self.results_text.see(tk.END)
        self.root.update()

    def clear_log(self):
        """Clear the results text area"""
        self.results_text.delete(1.0, tk.END)
        self.log_message("🗑️ Log cleared")

    def validate_admin_key(self):
        """Check if admin key is entered"""
        self.admin_key = self.admin_key_entry.get().strip()
        if not self.admin_key:
            messagebox.showwarning("Missing Admin Key", "Please enter your admin secret key!")
            return False
        return True

    def validate_runtime_config(self):
        if not self.api_url:
            messagebox.showerror(
                "Missing API URL",
                "SUPABASE_KEY_MANAGEMENT_URL is missing from your .env file."
            )
            return False

        if not self.publishable_key:
            messagebox.showerror(
                "Missing Publishable Key",
                "SUPABASE_PUBLISHABLE_KEY is missing from your .env file."
            )
            return False

        return True

    def make_api_request(self, data):
        """Make API request to Supabase Edge Function"""
        try:
            if not self.validate_runtime_config():
                return None

            self.status_var.set("Sending request...")

            headers = {
                'Content-Type': 'application/json',
                'apikey': self.publishable_key
            }

            response = requests.post(
                self.api_url,
                json=data,
                headers=headers,
                timeout=30
            )

            try:
                response_data = response.json()
            except ValueError:
                self.log_message(f"❌ Invalid JSON response: {response.text}")
                return None

            if response.ok:
                return response_data

            self.log_message(f"❌ HTTP Error {response.status_code}: {response_data}")
            return response_data

        except requests.exceptions.RequestException as e:
            self.log_message(f"❌ Network Error: {str(e)}")
            return None
        finally:
            self.status_var.set("Ready")

    def get_statistics(self):
        """Get license statistics from database"""
        if not self.validate_admin_key():
            return

        def run_stats():
            self.log_message("📊 Fetching license statistics...")

            request_data = {
                "action": "get_stats",
                "adminKey": self.admin_key
            }

            result = self.make_api_request(request_data)

            if result and result.get('success'):
                stats = result.get('stats', {})
                self.log_message("📊 LICENSE STATISTICS:")
                self.log_message(f"   📈 Total Keys: {stats.get('total_keys', 0)}")
                self.log_message(f"   🔓 Available Keys: {stats.get('available_keys', 0)}")
                self.log_message(f"   ✅ Active Licenses: {stats.get('active_licenses', 0)}")
                self.log_message(f"   💤 Inactive Licenses: {stats.get('inactive_licenses', 0)}")

                if stats.get('available_keys', 0) < 3:
                    self.log_message("⚠️ WARNING: Low available key count! Consider generating more keys.")
                else:
                    self.log_message("✅ Key pool status: Healthy")

            elif result:
                self.log_message(f"❌ Request failed: {result.get('message', 'Unknown error')}")

        # Run in thread to prevent UI freezing
        threading.Thread(target=run_stats, daemon=True).start()

    def auto_generate_keys(self):
        """Auto-generate keys if needed"""
        if not self.validate_admin_key():
            return

        def run_auto_gen():
            self.log_message("🔄 Checking key pool and auto-generating if needed...")

            request_data = {
                "action": "check_and_generate",
                "adminKey": self.admin_key
            }

            result = self.make_api_request(request_data)

            if result and result.get('success'):
                message = result.get('message', '')
                self.log_message(f"🔄 {message}")

                generated_keys = result.get("generated_keys", [])
                if generated_keys:
                    self.log_message(f"🔑 New keys generated:")
                    for key in generated_keys:
                        self.log_message(f"   • {key}")

                    before = result.get('available_before', 0)
                    after = result.get('available_after', 0)
                    self.log_message(f"📊 Available keys: {before} → {after}")

            elif result:
                self.log_message(f"❌ Auto-generation failed: {result.get('message', 'Unknown error')}")

        threading.Thread(target=run_auto_gen, daemon=True).start()

    def manual_generate_keys(self):
        """Manually generate specified number of keys"""
        if not self.validate_admin_key():
            return

        try:
            count = int(self.key_count_var.get())
            if count < 1 or count > 50:
                messagebox.showerror("Invalid Count", "Please enter a number between 1 and 50")
                return
        except ValueError:
            messagebox.showerror("Invalid Input", "Please enter a valid number")
            return

        def run_manual_gen():
            self.log_message(f"🔑 Manually generating {count} license keys...")

            request_data = {
                "action": "manual_generate",
                "adminKey": self.admin_key,
                "count": count
            }

            result = self.make_api_request(request_data)

            if result and result.get('success'):
                self.log_message(f"✅ Successfully generated {count} keys!")
                generated_keys = result.get('generated_keys', [])

                self.log_message("🔑 Generated keys:")
                for key in generated_keys:
                    self.log_message(f"   • {key}")

            elif result:
                self.log_message(f"❌ Manual generation failed: {result.get('message', 'Unknown error')}")

        threading.Thread(target=run_manual_gen, daemon=True).start()

    def run(self):
        """Start the application"""
        self.root.mainloop()


if __name__ == "__main__":
    # Create and run the admin tool
    admin_tool = LicenseAdminTool()
    admin_tool.run()
