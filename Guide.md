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

## Important scope note

This repository currently contains a frontend that calls the public PokéAPI. Docker and Kubernetes deploy that frontend; they do not create a backend or MongoDB database. Add a backend/database only as a separate application change when you are ready to extend the project.
