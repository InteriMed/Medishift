import subprocess
import sys
import os
import time
from pathlib import Path

class AppLauncher:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.backend_dir = self.root_dir / 'backend'
        self.frontend_dir = self.root_dir / 'frontend'
        self.processes = []

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
            
            frontend_process = subprocess.Popen(
                ['npm', 'start'],
                cwd=str(self.frontend_dir)
            )
            self.processes.append(('Frontend', frontend_process))
            print("✅ Frontend server started successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to start frontend server: {e}")
            return False

    def monitor_processes(self):
        """Monitor running processes and handle graceful shutdown"""
        try:
            while True:
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
                
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n🛑 Shutting down servers...")
            self.cleanup()
            print("👋 Goodbye!")

    def cleanup(self):
        """Clean up processes on shutdown"""
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

    print("\n🌟 All services started successfully!")
    print("📝 Access the application at:")
    print("   Frontend: http://localhost:3000")
    print("   API: http://localhost:5001")
    print("\nPress Ctrl+C to stop all servers\n")

    launcher.monitor_processes()

if __name__ == "__main__":
    main()
