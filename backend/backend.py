#!/usr/bin/env python
import os
import sys
import subprocess
import time
from pathlib import Path

class BackendServer:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent
        self.manage_py = self.base_dir / 'manage.py'
        self.env_file = self.base_dir / '.env'
        self.requirements_file = self.base_dir / 'requirements.txt'

    def check_environment(self):
        """Check if all required components are installed and configured"""
        print("🔍 Checking environment...")

        # Check Python version
        python_version = sys.version_info
        if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
            print("❌ Python 3.8 or higher is required")
            sys.exit(1)

        # Check if virtual environment is active
        if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            print("⚠️  Warning: Virtual environment not detected")
            response = input("Would you like to create one? (y/n): ")
            if response.lower() == 'y':
                self.setup_virtualenv()
            else:
                print("⚠️  Proceeding without virtual environment...")

        # Check requirements
        self.check_requirements()

        # Check .env file
        self.check_env_file()

        print("✅ Environment check completed")

    def setup_virtualenv(self):
        """Create and activate virtual environment"""
        print("🔧 Setting up virtual environment...")
        try:
            subprocess.run([sys.executable, '-m', 'venv', 'venv'], check=True)
            print("✅ Virtual environment created")
            
            # Activate virtual environment
            if os.name == 'nt':  # Windows
                activate_script = self.base_dir / 'venv' / 'Scripts' / 'activate.bat'
                print(f"To activate, run: {activate_script}")
            else:  # Unix/Linux/Mac
                activate_script = self.base_dir / 'venv' / 'bin' / 'activate'
                print(f"To activate, run: source {activate_script}")
            
            sys.exit(0)  # Exit to allow user to activate venv
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to create virtual environment: {e}")
            sys.exit(1)

    def check_requirements(self):
        """Check and install required packages"""
        print("📦 Checking requirements...")
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', str(self.requirements_file)], check=True)
            print("✅ Requirements installed")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install requirements: {e}")
            sys.exit(1)

    def check_env_file(self):
        """Check if .env file exists and is configured"""
        if not self.env_file.exists():
            print("⚠️  .env file not found")
            example_env = self.base_dir / '.env.example'
            if example_env.exists():
                print("📝 Creating .env from example...")
                with open(example_env) as f:
                    env_content = f.read()
                with open(self.env_file, 'w') as f:
                    f.write(env_content)
                print("✅ .env file created")
            else:
                print("❌ No .env.example file found")
                sys.exit(1)

    def run_migrations(self):
        """Run database migrations"""
        print("🔄 Running migrations...")
        try:
            subprocess.run([sys.executable, str(self.manage_py), 'migrate'], check=True)
            print("✅ Migrations complete")
        except subprocess.CalledProcessError as e:
            print(f"❌ Migration failed: {e}")
            sys.exit(1)

    def start_server(self):
        """Start the development server"""
        print("🚀 Starting development server...")
        try:
            # Check if port 8000 is available
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('127.0.0.1', 8000))
            sock.close()
            
            if result == 0:
                print("⚠️  Port 8000 is already in use")
                return
            
            # Start the server
            subprocess.run([
                sys.executable, 
                str(self.manage_py), 
                'runserver', 
                '--noreload'  # Disable auto-reload for stability
            ], check=True)
        except KeyboardInterrupt:
            print("\n👋 Server stopped")
        except subprocess.CalledProcessError as e:
            print(f"❌ Server failed to start: {e}")
            sys.exit(1)

def main():
    """Main entry point"""
    server = BackendServer()
    
    # Setup and checks
    server.check_environment()
    server.run_migrations()
    
    # Start server
    server.start_server()

if __name__ == "__main__":
    main() 