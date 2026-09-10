# Ensure shell scripts are executable when baked into golden AMI (run on Linux).
# Git may not preserve +x on Windows checkouts; post-deploy UserData should chmod +x.

scripts/
  prepare-golden-ami.sh
  tenant-post-deploy.sh
