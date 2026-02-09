output "dev_public_ip" {
  description = "Public IP of the dev EC2 instance"
  value       = aws_instance.ims_dev.public_ip
}

output "prod_public_ip" {
  description = "Public IP of the prod EC2 instance"
  value       = aws_instance.ims_prod.public_ip
}

output "ssh_dev" {
  description = "SSH command for dev instance"
  value       = "ssh -i ${replace(pathexpand(var.ssh_public_key_path), ".pub", "")} ubuntu@${aws_instance.ims_dev.public_ip}"
}

output "ssh_prod" {
  description = "SSH command for prod instance"
  value       = "ssh -i ${replace(pathexpand(var.ssh_public_key_path), ".pub", "")} ubuntu@${aws_instance.ims_prod.public_ip}"
}
