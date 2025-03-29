import subprocess
import sys
import os
import time
import webbrowser
from pathlib import Path

class AppLauncher:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.backend_dir = self.root_dir / 'backend'
        self.frontend_dir = self.root_dir / 'frontend'
        self.processes = []
        self.ngrok_tunnels = []
        self.last_url_display = 0
        self.url_file = self.root_dir / 'ngrok_urls.txt'
        self.html_file = self.root_dir / 'ngrok_urls.html'

    def check_dependencies(self):
        """Check if required dependencies are installed"""
        try:
            print("🔍 Checking and installing Python dependencies...")
            
            # Create a new virtual environment if it doesn't exist
            venv_dir = self.root_dir / 'venv'
            if not venv_dir.exists():
                print("Creating virtual environment...")
                subprocess.run([sys.executable, '-m', 'venv', str(venv_dir)], check=True)
            
            # Get the pip path from the virtual environment
            if sys.platform == "win32":
                pip_path = venv_dir / 'Scripts' / 'pip'
            else:
                pip_path = venv_dir / 'bin' / 'pip'
            
            # Upgrade pip first
            subprocess.run([str(pip_path), 'install', '--upgrade', 'pip'], check=True)
            
            # Install specific versions of Flask and Werkzeug
            subprocess.run([str(pip_path), 'install', 'Flask==2.0.1', 'Werkzeug==2.0.3'], check=True)
            
            # Install pyngrok for tunnel creation
            subprocess.run([str(pip_path), 'install', 'pyngrok'], check=True)
            
            # Install remaining requirements if any
            requirements_file = self.backend_dir / 'requirements.txt'
            if requirements_file.exists():
                subprocess.run([str(pip_path), 'install', '-r', str(requirements_file)], check=True)
            
            # Check if npm is installed
            subprocess.run(['npm', '--version'], stdout=subprocess.PIPE, check=True)
            
            print("✅ All dependencies installed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error checking dependencies: {e}")
            return False

    def start_backend(self):
        """Start the Flask API server"""
        try:
            print("🚀 Starting API server...")
            
            # Function to check if port is in use
            def is_port_in_use(port):
                import socket
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    try:
                        s.bind(('0.0.0.0', port))
                        return False
                    except OSError:
                        return True

            # Function to kill process on port (macOS/Linux specific)
            def kill_process_on_port_unix(port):
                try:
                    # Try lsof with sudo
                    cmd = f"sudo -S lsof -i :{port} -t"
                    pids = subprocess.check_output(cmd, shell=True).decode().strip().split('\n')
                    
                    # Kill each process found with sudo
                    for pid in pids:
                        if pid:
                            print(f"Killing process {pid} on port {port}")
                            subprocess.run(f"sudo -S kill -9 {pid}", shell=True)
                except:
                    pass

            PORT = 5001  # Changed from 5000 to 5001
            
            # Try to kill existing process on port
            if is_port_in_use(PORT):
                print(f"Port {PORT} is in use. Attempting to force kill all processes...")
                
                if sys.platform == "win32":
                    try:
                        subprocess.run(f'for /f "tokens=5" %a in (\'netstat -aon ^| find ":{PORT}" ^| find "LISTENING"\') do taskkill /f /pid %a', shell=True)
                    except:
                        pass
                else:
                    kill_process_on_port_unix(PORT)
                
                # Wait for port to be freed
                time.sleep(2)
                
                # Double check if port is free
                if is_port_in_use(PORT):
                    print(f"❌ Could not free port {PORT}. Please manually check running processes.")
                    print("Try these commands:")
                    if sys.platform == "win32":
                        print(f"netstat -ano | findstr :{PORT}")
                        print("taskkill /F /PID <PID>")
                    else:
                        print(f"sudo lsof -i :{PORT}")
                        print("sudo kill -9 <PID>")
                    return False

            # Add environment variables for Flask
            env = os.environ.copy()
            env['FLASK_ENV'] = 'development'
            env['PYTHONUNBUFFERED'] = '1'
            env['FLASK_APP'] = 'api.py'
            
            # Set Firebase config path
            firebase_config = self.backend_dir / 'config' / 'firebase-credentials.json'
            if not firebase_config.exists():
                print(f"❌ Firebase credentials not found at: {firebase_config}")
                return False
            env['FIREBASE_CONFIG_PATH'] = str(firebase_config)
            
            # Start API with more detailed error output
            api_process = subprocess.Popen(
                [sys.executable, '-m', 'flask', 'run', f'--port={PORT}', '--host=0.0.0.0'],
                cwd=str(self.backend_dir),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            
            # Check if process started successfully
            time.sleep(2)
            if api_process.poll() is not None:
                out, err = api_process.communicate()
                print(f"❌ API server failed to start")
                print(f"Output: {out}")
                print(f"Error: {err}")
                return False
            
            # Verify the server is actually responding
            import urllib.request
            try:
                urllib.request.urlopen(f'http://localhost:{PORT}/api/listings/jobs', timeout=5)
                print("✅ API server is responding to requests")
            except Exception as e:
                print(f"⚠️ API server started but not responding: {e}")
            
            self.processes.append(('API', api_process))
            print("✅ API server started successfully")
            return True
            
        except Exception as e:
            print(f"❌ Failed to start API server: {e}")
            return False

    def start_frontend(self):
        """Start the React frontend server"""
        try:
            print("🚀 Starting frontend server...")
            
            # Clean npm cache and remove existing node_modules
            subprocess.run(['npm', 'cache', 'clean', '--force'], cwd=str(self.frontend_dir), check=True)
            
            # Remove node_modules and package-lock.json if they exist
            node_modules = self.frontend_dir / 'node_modules'
            package_lock = self.frontend_dir / 'package-lock.json'
            
            if node_modules.exists():
                import shutil
                shutil.rmtree(node_modules)
            if package_lock.exists():
                package_lock.unlink()
            
            # Install dependencies with legacy-peer-deps flag
            subprocess.run(['npm', 'install', '--legacy-peer-deps'], cwd=str(self.frontend_dir), check=True)
            
            # Set environment variables to disable host checking for React development server
            env = os.environ.copy()
            env['DANGEROUSLY_DISABLE_HOST_CHECK'] = 'true'
            env['WDS_SOCKET_HOST'] = '0.0.0.0'
            env['WDS_SOCKET_PORT'] = '0'
            env['BROWSER'] = 'none'  # Prevent auto-opening browser
            
            # Create .env.development.local file to ensure settings persist
            env_file_path = self.frontend_dir / '.env.development.local'
            with open(env_file_path, 'w') as env_file:
                env_file.write("DANGEROUSLY_DISABLE_HOST_CHECK=true\n")
                env_file.write("WDS_SOCKET_HOST=0.0.0.0\n")
                env_file.write("WDS_SOCKET_PORT=0\n")
                env_file.write("HOST=0.0.0.0\n")
            
            # Start frontend with modified environment
            frontend_process = subprocess.Popen(
                ['npm', 'start'],
                cwd=str(self.frontend_dir),
                env=env
            )
            self.processes.append(('Frontend', frontend_process))
            print("✅ Frontend server started successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to start frontend server: {e}")
            return False

    def start_ngrok_tunnels(self):
        """Create Ngrok tunnels for the application"""
        try:
            print("🔄 Setting up Ngrok tunnels...")
            from pyngrok import ngrok, conf
            
            # Optional: Configure ngrok with auth token if available
            ngrok_token = os.environ.get('NGROK_AUTH_TOKEN')
            if ngrok_token:
                print("✅ Configuring ngrok with auth token")
                conf.get_default().auth_token = ngrok_token
            
            # Create tunnels for both frontend and backend
            backend_tunnel = ngrok.connect(5001, "http")
            frontend_tunnel = ngrok.connect(3000, "http")
            
            self.ngrok_tunnels = [backend_tunnel, frontend_tunnel]
            
            # Display the URLs prominently
            self.display_ngrok_urls()
            
            # Save to file and create HTML
            self.save_urls_to_file()
            
            return True
        except Exception as e:
            print(f"❌ Failed to create Ngrok tunnels: {e}")
            print("💡 If you have an Ngrok account, set your auth token with:")
            print("   export NGROK_AUTH_TOKEN=your_token_here")
            return False

    def save_urls_to_file(self):
        """Save Ngrok URLs to both text and HTML files"""
        if not self.ngrok_tunnels or len(self.ngrok_tunnels) < 2:
            return
            
        backend_url = self.ngrok_tunnels[0].public_url
        frontend_url = self.ngrok_tunnels[1].public_url
        
        # Save to text file
        with open(self.url_file, 'w') as f:
            f.write(f"PHARMASOFT APPLICATION URLS\n")
            f.write(f"=========================\n\n")
            f.write(f"FRONTEND: {frontend_url}\n")
            f.write(f"BACKEND: {backend_url}\n\n")
            f.write(f"Last updated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Create an HTML file with the links
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>PharmaSoft Application URLs</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
            background: #f7f9fc;
        }}
        .container {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #3949ab;
        }}
        .url-box {{
            margin: 20px 0;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 5px;
            border-left: 5px solid #2196f3;
        }}
        .url-box h2 {{
            margin-top: 0;
            color: #0d47a1;
        }}
        a {{
            color: #1565c0;
            text-decoration: none;
            word-break: break-all;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        .timestamp {{
            color: #757575;
            font-size: 0.8em;
            margin-top: 30px;
        }}
        .qr-container {{
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            flex-wrap: wrap;
        }}
        .qr-box {{
            margin: 10px;
            text-align: center;
        }}
        img.qr {{
            max-width: 200px;
            height: auto;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>PharmaSoft Application</h1>
        <p>Access your application through these public URLs:</p>
        
        <div class="url-box">
            <h2>Frontend</h2>
            <p>Use this link to access the application interface:</p>
            <a href="{frontend_url}" target="_blank">{frontend_url}</a>
        </div>
        
        <div class="url-box">
            <h2>Backend API</h2>
            <p>API endpoint (for developers):</p>
            <a href="{backend_url}" target="_blank">{backend_url}</a>
        </div>
        
        <div class="qr-container">
            <div class="qr-box">
                <h3>Frontend QR Code</h3>
                <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={frontend_url}" alt="Frontend QR Code">
            </div>
            <div class="qr-box">
                <h3>Backend QR Code</h3>
                <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={backend_url}" alt="Backend QR Code">
            </div>
        </div>
        
        <p class="timestamp">Last updated: {time.strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
</body>
</html>
"""
        with open(self.html_file, 'w') as f:
            f.write(html_content)
        
        print(f"\n📄 URLs saved to: {self.url_file}")
        print(f"🌐 HTML page created: {self.html_file}")
        
        # Try to open the HTML file in the browser
        try:
            webbrowser.open(f"file://{self.html_file.absolute()}")
            print("✅ URL page opened in browser")
        except:
            print(f"⚠️ Couldn't open browser automatically. Open {self.html_file} manually.")

    def display_ngrok_urls(self):
        """Display Ngrok URLs in a highly visible format"""
        if not self.ngrok_tunnels or len(self.ngrok_tunnels) < 2:
            return
            
        # Create a very visible box for the URLs
        backend_url = self.ngrok_tunnels[0].public_url
        frontend_url = self.ngrok_tunnels[1].public_url
        
        separator = "=" * 80
        
        print("\n" + separator)
        print(f"{'🌐 PUBLIC URLs FOR YOUR APPLICATION 🌐':^80}")
        print(separator)
        print(f"{'FRONTEND (Open this in your browser to see the application)':^80}")
        print(f"{frontend_url:^80}")
        print(f"{'BACKEND API':^80}")
        print(f"{backend_url:^80}")
        print(separator)
        print(f"{'SCAN THESE QR CODES WITH YOUR MOBILE DEVICE':^80}")
        
        # Try to generate QR codes if qrcode library is available
        try:
            import qrcode
            from io import StringIO
            
            # Function to generate ASCII QR code
            def generate_ascii_qr(url):
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=1,
                    border=1,
                )
                qr.add_data(url)
                qr.make(fit=True)
                
                output = StringIO()
                qr.print_ascii(out=output)
                return output.getvalue()
            
            # Try to display ASCII QR codes in the terminal
            try:
                print("\nFrontend QR Code:")
                print(generate_ascii_qr(frontend_url))
                print("\nBackend QR Code:")
                print(generate_ascii_qr(backend_url))
            except Exception as e:
                print(f"Could not generate ASCII QR codes: {e}")
                
        except ImportError:
            print("\nTip: Install 'qrcode' package for QR codes in terminal")
            print("    (pip install qrcode)")
        
        print(separator)
        print(f"\n💾 URLs saved to: {self.url_file}")
        print(f"🔗 HTML page with URLs: {self.html_file}")
        print(f"\n💡 If terminal output gets cleared, you can:")
        print(f"   1. Press 'u' and Enter to redisplay URLs")
        print(f"   2. Open the HTML file in your browser")
        print(f"   3. Check the text file for URLs\n")
        self.last_url_display = time.time()

    def monitor_processes(self):
        """Monitor running processes and handle graceful shutdown"""
        try:
            # Add help message
            print("\n💡 Press 'u' and Enter at any time to redisplay URLs")
            print("💡 Press 'o' and Enter to open URLs page in browser")
            print("💡 Press Ctrl+C to exit")
            
            # Set up non-blocking input
            import threading
            import queue
            
            input_queue = queue.Queue()
            
            def input_reader():
                while True:
                    try:
                        input_line = input()
                        input_queue.put(input_line)
                    except (EOFError, KeyboardInterrupt):
                        break
            
            input_thread = threading.Thread(target=input_reader, daemon=True)
            input_thread.start()
            
            while True:
                # Check for process termination
                for name, process in self.processes:
                    if process.poll() is not None:
                        # Process terminated - get output
                        out, err = process.communicate()
                        print(f"⚠️ {name} process terminated unexpectedly")
                        if out:
                            print(f"Output: {out}")
                        if err:
                            print(f"Error: {err}")
                        
                        # Try to restart
                        print(f"Attempting to restart {name}...")
                        if name == "API":
                            if self.start_backend():
                                print(f"✅ {name} restarted successfully")
                            else:
                                print(f"❌ Failed to restart {name}")
                                self.cleanup()
                                return
                        elif name == "Frontend":
                            if self.start_frontend():
                                print(f"✅ {name} restarted successfully")
                            else:
                                print(f"❌ Failed to restart {name}")
                                self.cleanup()
                                return
                
                # Check for user input to redisplay URLs
                try:
                    input_line = input_queue.get_nowait()
                    if input_line.lower() == 'u':
                        self.display_ngrok_urls()
                    elif input_line.lower() == 'o':
                        try:
                            webbrowser.open(f"file://{self.html_file.absolute()}")
                            print("✅ URL page opened in browser")
                        except:
                            print(f"⚠️ Couldn't open browser automatically. Open {self.html_file} manually.")
                except queue.Empty:
                    pass
                
                # Periodically redisplay URLs (every 5 minutes)
                if self.ngrok_tunnels and time.time() - self.last_url_display > 300:
                    # Just print a reminder instead of full display to avoid clutter
                    print(f"\n⏰ Reminder: URLs available at {self.url_file} and {self.html_file}")
                    print(f"   Press 'u' to display URLs again or 'o' to open in browser\n")
                    self.last_url_display = time.time()
                
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n🛑 Shutting down servers...")
            self.cleanup()
            print("👋 Goodbye!")

    def cleanup(self):
        """Clean up processes and ngrok tunnels on shutdown"""
        # Close ngrok tunnels
        if self.ngrok_tunnels:
            try:
                from pyngrok import ngrok
                print("🔄 Closing Ngrok tunnels...")
                ngrok.kill()
                print("✅ Ngrok tunnels closed")
            except Exception as e:
                print(f"❌ Error closing Ngrok tunnels: {e}")
        
        # Terminate processes
        for name, process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
                print(f"✅ {name} server shutdown successfully")
            except subprocess.TimeoutExpired:
                process.kill()
                print(f"⚠️ Force killed {name} server")
            except Exception as e:
                print(f"❌ Error shutting down {name} server: {e}")

def main():
    launcher = AppLauncher()
    
    print("🔍 Checking dependencies...")
    if not launcher.check_dependencies():
        print("❌ Failed to verify dependencies")
        return

    if not launcher.start_backend():
        print("❌ Failed to start backend")
        return

    if not launcher.start_frontend():
        print("❌ Failed to start frontend")
        launcher.cleanup()
        return
    
    # Install qrcode package if not already installed
    try:
        import qrcode
    except ImportError:
        print("📦 Installing qrcode package for QR code display...")
        try:
            venv_dir = launcher.root_dir / 'venv'
            if sys.platform == "win32":
                pip_path = venv_dir / 'Scripts' / 'pip'
            else:
                pip_path = venv_dir / 'bin' / 'pip'
            subprocess.run([str(pip_path), 'install', 'qrcode'], check=True)
            print("✅ QR code package installed")
        except:
            print("⚠️ Could not install QR code package, continuing without QR codes")
    
    if not launcher.start_ngrok_tunnels():
        print("⚠️ Failed to create Ngrok tunnels, but local servers are running")
        print("💡 You can continue using the app locally")
    
    print("\n🌟 All services started successfully!")
    print("📝 Access the application at:")
    print("   Local Frontend: http://localhost:3000")
    print("   Local API: http://localhost:5001")
    
    launcher.monitor_processes()

if __name__ == "__main__":
    main()
