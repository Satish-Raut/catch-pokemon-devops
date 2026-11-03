# DevOps deployment guide

This guide uses the **existing React/Vite Pokémon app** in this repository. It does not add a backend or MongoDB. The first goal is to deploy the current frontend locally, then automate that same workflow with Jenkins. After that works, you can move the Kubernetes deployment to AWS EKS.

The learning path is:

```text
GitHub → Jenkins → lint/build → Docker image → Docker Hub → Kubernetes
```

Commands below use **PowerShell on Windows**. Run them from the repository root unless a step says otherwise. Replace example names and values with your own.

## What you need

- Git and a GitHub repository containing this project
- Node.js 20 or newer and npm
- Docker Desktop, with its Kubernetes engine or your existing local Kubernetes cluster running
- `kubectl` configured for that local cluster
- A Docker Hub account
- Jenkins running locally, with Git, Pipeline, and Credentials plugins

> Docker Hub public repositories are convenient for learning, but public images can be pulled by anyone. Docker Hub also applies pull limits. AWS resources such as EKS, EC2, NAT gateways, and load balancers may cost money; check current pricing before creating them.

## Step 1: Confirm the app and Git repository work

Check the current directory and branch:

```powershell
git status
git branch --show-current
git remote -v
```

Install dependencies and validate the existing frontend:

```powershell
npm ci
npm run lint
npm run build
```

Start the app locally:

```powershell
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`) and confirm the Pokémon cards load. Stop the dev server with `Ctrl+C`.

**Continue when:** lint and build succeed, and the app works in your browser.

If you have intentional app changes to commit, inspect `git status` and stage only the files you mean to include. Do not use `git add .` if the worktree contains unrelated changes:

```powershell
git add path\to\file
git commit -m "Prepare app for deployment"
git push origin main
```

If Git says there is nothing to commit, that is fine; verify that your latest commit is already pushed.

## Step 2: Add a Docker image for the frontend

Create a file named `Dockerfile` in the repository root:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

Create a `.dockerignore` in the repository root:

```text
node_modules
dist
.git
*.log
```

Build the image:

```powershell
docker build -t catch-pokemon:local .
```

Run it locally:

```powershell
docker run --rm -d --name catch-pokemon-local -p 8080:80 catch-pokemon:local
```

Open `http://localhost:8080`. When done, stop the container:

```powershell
docker stop catch-pokemon-local
```

**Continue when:** the container serves the app at `http://localhost:8080`.

## Step 3: Push the image to Docker Hub

1. In Docker Hub, create a repository named `catch-pokemon`. Set it to **Public** for the simplest learning setup.
2. Log in to Docker Hub locally. Prefer a Docker Hub access token over your account password:

   ```powershell
   docker login --username YOUR_DOCKERHUB_USERNAME
   ```

3. Tag and push an initial image. Replace `YOUR_DOCKERHUB_USERNAME`:

   ```powershell
   docker tag catch-pokemon:local YOUR_DOCKERHUB_USERNAME/catch-pokemon:initial
   docker push YOUR_DOCKERHUB_USERNAME/catch-pokemon:initial
   ```

4. Confirm the `initial` tag appears in your Docker Hub repository.

**Continue when:** the image is visible in Docker Hub. Do not put Docker Hub passwords or tokens in Git.

## Step 4: Deploy the image to local Kubernetes

First confirm `kubectl` can reach your running cluster:

```powershell
kubectl config current-context
kubectl get nodes
```

If no node is listed, start your local cluster (for example, in Docker Desktop or Minikube) and retry. Make sure this is the local context, not a cloud cluster.

Create a folder named `k8s` and save the following as `k8s\app.yaml`. Replace `YOUR_DOCKERHUB_USERNAME` with your Docker Hub username:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: catch-pokemon
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catch-pokemon
  namespace: catch-pokemon
spec:
  replicas: 1
  selector:
    matchLabels:
      app: catch-pokemon
  template:
    metadata:
      labels:
        app: catch-pokemon
    spec:
      containers:
        - name: frontend
          image: YOUR_DOCKERHUB_USERNAME/catch-pokemon:initial
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 80
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 3
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 10
            periodSeconds: 20
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 250m
              memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: catch-pokemon
  namespace: catch-pokemon
spec:
  selector:
    app: catch-pokemon
  ports:
    - name: http
      port: 80
      targetPort: http
  type: ClusterIP
```

Apply the resources and wait for the pod:

```powershell
kubectl apply -f k8s\app.yaml
kubectl rollout status deployment/catch-pokemon -n catch-pokemon
kubectl get pods,services -n catch-pokemon
```

Access it from your computer using port forwarding:

```powershell
kubectl port-forward service/catch-pokemon 8080:80 -n catch-pokemon
```

Keep that terminal open and browse to `http://localhost:8080`. Stop port forwarding with `Ctrl+C`.

**Continue when:** the pod is `Running` and the app loads through port forwarding. If it does not, inspect:

```powershell
kubectl describe pods -n catch-pokemon
kubectl logs deployment/catch-pokemon -n catch-pokemon
```

## Step 5: Prepare Jenkins on your Windows computer

The simplest local setup is a Jenkins agent running on the same Windows computer and under the same Windows user that has access to Docker Desktop and the Kubernetes config. A Jenkins service running as `LocalSystem` may not see your Docker Desktop connection or your `%USERPROFILE%\.kube\config`.

On the machine/agent that executes the pipeline, verify these commands work:

```powershell
git --version
node --version
npm --version
docker version
kubectl get nodes
```

Also run `docker build` and `kubectl get nodes` from the Jenkins agent itself if it is separate from your interactive terminal. Jenkins jobs use the tools and permissions of their agent.

In Jenkins:

1. Install the **Git**, **Pipeline**, and **Credentials Binding** plugins if missing.
2. Add a credential with kind **Username with password**:
   - ID: `dockerhub-creds`
   - Username: your Docker Hub username
   - Password: a Docker Hub access token
3. Confirm Jenkins can check out your GitHub repository. For a private repository, add GitHub credentials in Jenkins and use them in the job configuration.

**Continue when:** Jenkins can check out the repository, and its build agent can run Docker and reach the local Kubernetes cluster.

## Step 6: Add the Jenkins pipeline

Create a file named `Jenkinsfile` at the repository root. Replace the Docker Hub username in `DOCKERHUB_REPO`. Keep the credentials ID consistent with the credential created in Step 5.

```groovy
pipeline {
  agent any

  environment {
    DOCKERHUB_REPO = 'YOUR_DOCKERHUB_USERNAME/catch-pokemon'
    K8S_NAMESPACE = 'catch-pokemon'
    K8S_DEPLOYMENT = 'catch-pokemon'
    K8S_CONTAINER = 'frontend'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Lint and build') {
      steps {
        bat 'npm ci'
        bat 'npm run lint'
        bat 'npm run build'
      }
    }

    stage('Build Docker image') {
      steps {
        bat 'docker build --pull -t "%DOCKERHUB_REPO%:%BUILD_NUMBER%" .'
      }
    }

    stage('Push to Docker Hub') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-creds',
          usernameVariable: 'DOCKERHUB_USER',
          passwordVariable: 'DOCKERHUB_TOKEN'
        )]) {
          bat 'echo %DOCKERHUB_TOKEN% | docker login --username %DOCKERHUB_USER% --password-stdin'
          bat 'docker push "%DOCKERHUB_REPO%:%BUILD_NUMBER%"'
          bat 'docker logout'
        }
      }
    }

    stage('Deploy to local Kubernetes') {
      steps {
        bat 'kubectl set image deployment/%K8S_DEPLOYMENT% %K8S_CONTAINER%="%DOCKERHUB_REPO%:%BUILD_NUMBER%" --namespace %K8S_NAMESPACE%'
        bat 'kubectl rollout status deployment/%K8S_DEPLOYMENT% --namespace %K8S_NAMESPACE% --timeout=120s'
      }
    }
  }
}
```

The pipeline uses the Jenkins build number as a unique image tag. This makes Kubernetes pull the new image instead of reusing an old tag.

Commit and push the Docker and Kubernetes files and Jenkinsfile:

```powershell
git add Dockerfile .dockerignore k8s/app.yaml Jenkinsfile Guide.md
git commit -m "Add local Kubernetes deployment pipeline"
git push origin main
```

In Jenkins, create a **Pipeline** job:

1. Select **Pipeline script from SCM**.
2. Choose **Git**, enter your repository URL, and select `main`.
3. Select the repository credential if the repository is private.
4. Set the script path to `Jenkinsfile`.
5. Save and click **Build Now**.

Watch the console output. The expected stages are checkout, lint/build, Docker build, Docker Hub push, then Kubernetes rollout.

**Continue when:** Jenkins finishes successfully and reports a successful rollout. Verify the running image and pod:

```powershell
kubectl get deployment,pods -n catch-pokemon
kubectl describe deployment catch-pokemon -n catch-pokemon
```

Run port forwarding again to view the updated app:

```powershell
kubectl port-forward service/catch-pokemon 8080:80 -n catch-pokemon
```

### Trigger builds automatically (optional)

For a GitHub repository, configure a webhook to notify Jenkins when `main` changes, and enable the appropriate GitHub push trigger in the Jenkins job. The Jenkins URL must be reachable by GitHub; do not expose an unsecured Jenkins server to the public internet just to enable a webhook. For local learning, clicking **Build Now** is sufficient.

## Step 7: How to work on each change

Use this loop for future application changes:

1. Make a change and test it with `npm run lint` and `npm run build`.
2. Commit and push to GitHub.
3. Run the Jenkins job (or let the configured webhook start it).
4. Check that the build and Docker Hub push succeeded.
5. Check that the Kubernetes rollout succeeded.
6. Open the app and verify the change.
7. If deployment fails, inspect the Jenkins log, then run `kubectl describe` and `kubectl logs` before trying again.

To roll back the Kubernetes Deployment to its previous revision:

```powershell
kubectl rollout undo deployment/catch-pokemon -n catch-pokemon
kubectl rollout status deployment/catch-pokemon -n catch-pokemon
```

## Step 8: Move the deployment from local Kubernetes to AWS EKS later

Do this only after the local pipeline works. EKS is a managed Kubernetes control plane in AWS; it is not simply Kubernetes installed on an EC2 instance. AWS still charges for the EKS cluster and related resources, and Free Tier eligibility changes over time.

1. Plan the VPC, subnets across Availability Zones, routing, and security groups. Avoid exposing worker nodes directly to the internet.
2. Create the EKS cluster and worker nodes in that VPC. Follow the current AWS EKS setup guide for IAM roles, cluster access, and required subnet configuration.
3. Configure `kubectl` for the EKS cluster using AWS CLI and verify the context before deploying:

   ```powershell
   aws eks update-kubeconfig --region YOUR_AWS_REGION --name YOUR_EKS_CLUSTER
   kubectl config current-context
   kubectl get nodes
   ```

4. Decide how Jenkins reaches EKS. A Jenkins agent inside AWS with an IAM role is generally preferable. If Jenkins stays on your computer, the EKS API endpoint must be reachable and access must be tightly restricted. Do not store long-lived AWS access keys in the repository.
5. Give the Jenkins agent role only the AWS and EKS access it needs. Its Kubernetes identity must also be authorized in the EKS cluster.
6. Ensure the EKS nodes can pull your Docker Hub image. Public repositories need no pull secret. For a private repository, create a Kubernetes image-pull secret outside Git and reference it from the Pod specification.
7. Test a deployment manually by switching `kubectl` to the EKS context and applying the manifest:

   ```powershell
   kubectl apply -f k8s\app.yaml
   kubectl rollout status deployment/catch-pokemon -n catch-pokemon
   ```

8. Configure public access intentionally. A `ClusterIP` service is private to the cluster; for internet access, use an ingress/load balancer design appropriate to EKS and its controllers. AWS load balancers and networking may add charges.
9. After manual EKS deployment works, point the Jenkins deployment stage at the EKS context. Keep the local deployment workflow available for low-cost development.
10. When finished experimenting, delete cloud resources you no longer need using AWS's documented cleanup steps. Deleting only the EC2 instance may leave other billable resources behind.

## Cloud deployment: EC2 or EKS

These are two different ways to run the same Docker Hub image. Choose **one** for your first cloud deployment:

- **EC2 with Docker:** simplest AWS option. You manage the virtual machine and run the container directly on it.
- **EKS:** Kubernetes in AWS. You deploy the container to a cluster in your VPC. This is closer to the local Kubernetes workflow, but requires more AWS setup and usually costs more.

In both cases, build and push the image to Docker Hub first, using a unique tag such as `YOUR_DOCKERHUB_USERNAME/catch-pokemon:17`. Do not deploy the floating `latest` tag in this learning pipeline; a unique tag makes it clear which build is running.

### Option A: Run the container directly on an EC2 instance

#### A1. Create and secure the instance

1. In AWS, create or select a VPC with a public subnet, a route to an internet gateway, and a security group for the app. Launch an Amazon Linux 2023 EC2 instance in that subnet and assign it a public IPv4 address.
2. In the security group, allow inbound **HTTP TCP 80** from the clients that should access the app (for a public demo, `0.0.0.0/0`). Allow **SSH TCP 22 only from your current public IP**. Do not open Docker's remote API port `2375` or Jenkins' port `8080` to the internet.
3. Keep the downloaded SSH private key outside the repository. For a more secure setup, prefer AWS Systems Manager Session Manager instead of public SSH.
4. Note the instance's public IPv4 address or public DNS name. The instance needs outbound internet access to pull a public Docker Hub image.

#### A2. Install Docker and run the image

From PowerShell on your computer, connect with your downloaded key (replace the path and address):

```powershell
ssh -i .\my-key.pem ec2-user@EC2_PUBLIC_IP
```

In the EC2 shell, install and start Docker:

```sh
sudo dnf install -y docker
sudo systemctl enable --now docker
```

Pull and start the image. Replace the Docker Hub username and tag with the image you pushed:

```sh
sudo docker pull YOUR_DOCKERHUB_USERNAME/catch-pokemon:17
sudo docker run -d --name catch-pokemon --restart unless-stopped \
  -p 80:80 YOUR_DOCKERHUB_USERNAME/catch-pokemon:17
sudo docker ps
```

Open `http://EC2_PUBLIC_IP` in your browser. To inspect the container if it does not load:

```sh
sudo docker logs catch-pokemon
sudo docker ps -a
```

**Continue when:** the container is running and the app loads from the instance's public address.

#### A3. Update the EC2 deployment

For a manual update, use the next image tag pushed to Docker Hub. On the EC2 instance:

```sh
sudo docker pull YOUR_DOCKERHUB_USERNAME/catch-pokemon:18
sudo docker rm -f catch-pokemon
sudo docker run -d --name catch-pokemon --restart unless-stopped \
  -p 80:80 YOUR_DOCKERHUB_USERNAME/catch-pokemon:18
```

This simple replacement can briefly interrupt the app. For automated deployment, Jenkins must reach the instance securely. A practical learning setup is a Jenkins agent in the same VPC using AWS Systems Manager; alternatively, use SSH with a key stored in Jenkins Credentials and restrict port 22 to the agent's fixed IP. Do not commit the key or put it in a `Jenkinsfile`.

The EC2 deploy commands for the Jenkins stage are the same pull/replace/run commands above, using the current build tag. Before automating them, confirm that the Jenkins agent can connect to the instance and run Docker commands. Avoid exposing a Docker socket or remote Docker API to make this work.

### Option B: Deploy to EKS in your VPC

Use this option after the local Kubernetes deployment works. EKS provides a managed Kubernetes control plane; you still pay for and manage worker compute and related AWS resources.

#### B1. Set up AWS networking and the cluster

1. Choose a VPC with subnets in at least two Availability Zones. Follow the current EKS guidance for public/private subnet routing and subnet tags. Put worker nodes in private subnets where practical; they need a suitable outbound path to pull public Docker Hub images.
2. Create the EKS cluster and worker nodes using the current AWS EKS instructions. Configure the cluster access method, IAM roles, and worker-node access as documented by AWS.
3. Install/configure AWS CLI and `kubectl` on the machine or Jenkins agent that will deploy. Select the EKS context and confirm it is the intended cluster:

   ```powershell
   aws eks update-kubeconfig --region YOUR_AWS_REGION --name YOUR_EKS_CLUSTER
   kubectl config current-context
   kubectl get nodes
   ```

4. Authorize the deployer's IAM identity for the cluster using EKS access configuration and Kubernetes permissions. Prefer an IAM role for an AWS-hosted Jenkins agent rather than long-lived AWS access keys. Do not put credentials in Git.
5. Ensure your Docker Hub repository is public for the simplest setup. If private, create an image pull secret in the `catch-pokemon` namespace and reference it from the Deployment; keep the token out of source control.

#### B2. Deploy and expose the app

First deploy the image to the cluster and check the rollout:

```powershell
kubectl apply -f k8s\app.yaml
kubectl rollout status deployment/catch-pokemon -n catch-pokemon
kubectl get pods,services -n catch-pokemon
```

The local manifest uses a `ClusterIP` service, which is not directly reachable from the public internet. For an internet-facing demo, choose and configure an EKS-supported ingress or load-balancer approach, including its controller/add-on, subnet requirements, and security rules. A `LoadBalancer` service can provision AWS load-balancer resources and incur charges. If you only need to test access, use port forwarding instead:

```powershell
kubectl port-forward service/catch-pokemon 8080:80 -n catch-pokemon
```

Then open `http://localhost:8080`. For public access, use the address created by your ingress/load balancer and confirm only intended traffic is allowed.

**Continue when:** the pods are ready and the app works through port forwarding or the configured ingress/load balancer.

#### B3. Point Jenkins at EKS

Keep the existing Jenkins build and Docker Hub push stages. Run the deployment stage on an agent that has AWS CLI, `kubectl`, network access to the EKS API, and an IAM identity authorized for that cluster. A Linux agent can use a stage like this (set `AWS_REGION`, `EKS_CLUSTER`, and `DOCKERHUB_REPO` in the pipeline environment):

```groovy
stage('Deploy to EKS') {
  steps {
    sh '''
      aws eks update-kubeconfig --region "$AWS_REGION" --name "$EKS_CLUSTER"
      kubectl set image deployment/catch-pokemon \
        frontend="$DOCKERHUB_REPO:$BUILD_NUMBER" --namespace catch-pokemon
      kubectl rollout status deployment/catch-pokemon \
        --namespace catch-pokemon --timeout=180s
    '''
  }
}
```

The example assumes the Kubernetes Deployment is named `catch-pokemon` and its container is named `frontend`, as in this guide's manifest. If your Jenkins agent is Windows, use Windows-compatible pipeline steps instead of `sh`, and make sure AWS CLI and `kubectl` are available to the Jenkins service account. Do not run local and EKS deployment stages against the same `kubectl` context by accident; verify the context/cluster before deploying.

#### B4. Verify, monitor, and clean up

After Jenkins succeeds, verify the image and rollout:

```powershell
kubectl get deployment,pods,services -n catch-pokemon
kubectl describe deployment catch-pokemon -n catch-pokemon
kubectl rollout history deployment/catch-pokemon -n catch-pokemon
```

If a rollout fails, inspect pod events and logs before retrying:

```powershell
kubectl describe pods -n catch-pokemon
kubectl logs deployment/catch-pokemon -n catch-pokemon
```

When finished experimenting, remove resources using the AWS cleanup instructions for the resources you created. Check for remaining load balancers, disks, public IP addresses, NAT gateways, and cluster/node resources; deleting only an EC2 instance or Kubernetes Deployment may not remove those billable resources. Check current AWS pricing and Free Tier eligibility before starting—the EKS control plane and associated resources may not be free.

## Simple Jenkins pipeline: deploy directly to EC2 (no Kubernetes)

Use this path now if your goal is to automate deployment to one EC2 instance. It builds the existing React app, pushes a uniquely tagged image to Docker Hub, then SSHes to EC2 and replaces the running container. It does not use Kubernetes or EKS.

The flow is:

```text
GitHub → Jenkins (lint/build) → Docker image → Docker Hub → SSH → EC2 Docker container
```

### EC2 and Jenkins prerequisites

1. Complete **Option A1 and A2** above once: launch the EC2 instance, install Docker, and manually run a Docker Hub image successfully.
2. In the EC2 security group, allow inbound HTTP TCP 80 from intended visitors. Allow SSH TCP 22 only from the public IP address of the Jenkins agent. If Jenkins is running on your home computer, that IP may change; a Jenkins agent in the same VPC or AWS Systems Manager is preferable for a longer-lived setup. Never open SSH to `0.0.0.0/0`.
3. Ensure the Jenkins agent is a Windows machine with Git, Node.js/npm, Docker, and OpenSSH Client available. The agent must be able to build and push Docker images, and connect to EC2 on port 22. If Jenkins runs as a Windows service, install/configure these tools for the service account and verify them from an agent job.
4. On EC2, verify `ec2-user` can run Docker with `sudo docker ...` without an interactive password prompt. The instance must have outbound internet access to pull the public Docker Hub image.
5. In Jenkins **Manage Credentials**, add:
   - A **Username with password** credential for Docker Hub, ID `dockerhub-creds`; use a Docker Hub access token as the password.
   - An **SSH Username with private key** credential, ID `ec2-ssh-key`; username `ec2-user`, and the EC2 private key as the key. Do not save the key in the repository or workspace.
6. Configure the EC2 SSH host key in the Jenkins agent account's `known_hosts` file with the host fingerprint verified through a trusted AWS channel. The pipeline uses strict host-key checking; do not disable it to work around an SSH error.
7. Check `git status` and commit only the intended Docker files and pipeline. Avoid `git add .` if there are unrelated working-tree changes.

### Add a separate EC2 Jenkinsfile

Create `Jenkinsfile.ec2` at the repository root. Replace the Docker Hub username and EC2 public DNS/IP. This separate pipeline path lets the current local Kubernetes Jenkinsfile remain unchanged. In a Jenkins Pipeline job, select **Pipeline script from SCM** and set **Script Path** to `Jenkinsfile.ec2`.

```groovy
pipeline {
  agent any

  environment {
    DOCKERHUB_REPO = 'YOUR_DOCKERHUB_USERNAME/catch-pokemon'
    EC2_HOST = 'ec2-REPLACE-WITH-YOUR-HOST.compute.amazonaws.com'
    EC2_CONTAINER = 'catch-pokemon'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Lint and build') {
      steps {
        bat 'npm ci'
        bat 'npm run lint'
        bat 'npm run build'
      }
    }

    stage('Build Docker image') {
      steps {
        bat 'docker build --pull -t "%DOCKERHUB_REPO%:%BUILD_NUMBER%" .'
      }
    }

    stage('Push to Docker Hub') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-creds',
          usernameVariable: 'DOCKERHUB_USER',
          passwordVariable: 'DOCKERHUB_TOKEN'
        )]) {
          bat 'echo %DOCKERHUB_TOKEN% | docker login --username %DOCKERHUB_USER% --password-stdin'
          bat 'docker push "%DOCKERHUB_REPO%:%BUILD_NUMBER%"'
          bat 'docker logout'
        }
      }
    }

    stage('Deploy to EC2') {
      steps {
        withCredentials([sshUserPrivateKey(
          credentialsId: 'ec2-ssh-key',
          keyFileVariable: 'EC2_SSH_KEY',
          usernameVariable: 'EC2_SSH_USER'
        )]) {
          bat 'ssh -i "%EC2_SSH_KEY%" -o BatchMode=yes -o StrictHostKeyChecking=yes %EC2_SSH_USER%@%EC2_HOST% "sudo docker pull %DOCKERHUB_REPO%:%BUILD_NUMBER% && (sudo docker rm -f %EC2_CONTAINER% || true) && sudo docker run -d --name %EC2_CONTAINER% --restart unless-stopped -p 80:80 %DOCKERHUB_REPO%:%BUILD_NUMBER%"'
        }
      }
    }
  }
}
```

The EC2 deploy stage pulls the public image, removes the previous container, and starts the new one on port 80. That replacement can cause a short interruption. Do not make the Docker Hub image private without also configuring EC2 to authenticate to Docker Hub; credentials should not be embedded in the remote command.

### Run and verify the pipeline

1. Commit and push `Jenkinsfile.ec2` and any deployment files you intend to use.
2. Create a Jenkins Pipeline job pointing at the GitHub repository and branch. Set **Script Path** to `Jenkinsfile.ec2`, then save.
3. Select **Build Now** and follow **Console Output**. The expected stages are checkout, lint/build, image build, Docker Hub push, and EC2 deploy.
4. If the job fails, fix that stage before proceeding. Common blockers:
   - `docker` or `npm` not found: install/configure it for the Jenkins agent service account.
   - SSH timeout: check the EC2 security group source IP, instance address, and route.
   - Host key verification failure: verify and add the EC2 host key to the Jenkins agent account's `known_hosts`.
   - Permission denied: check the `ec2-ssh-key` credential and `ec2-user`.
   - Docker permission/sudo failure: verify `sudo docker ps` works non-interactively on EC2.
   - Pull failure: verify the image name/tag, public repository visibility, and EC2 outbound internet access.
5. After a successful build, open `http://EC2_PUBLIC_IP` or the EC2 public DNS name. On EC2, verify the container and inspect its logs if needed:

   ```sh
   sudo docker ps
   sudo docker logs catch-pokemon
   ```

6. Push a small code change to GitHub and run the job again. Confirm the new Jenkins build number appears in the deployment and the app still loads.

This is a simple single-instance learning deployment, not a highly available production setup. It has no zero-downtime replacement, TLS termination, autoscaling, or health-based rollback. Add those separately after this pipeline works. AWS charges can still apply to EC2, public IPv4 addresses, storage, and data transfer; review current pricing and remove resources when finished.

## Important scope note

This repository currently contains a frontend that calls the public PokéAPI. Docker and Kubernetes deploy that frontend; they do not create a backend or MongoDB database. Add a backend/database only as a separate application change when you are ready to extend the project.
