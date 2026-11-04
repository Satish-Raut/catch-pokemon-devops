
pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'devenvsatish/catch-pokemon'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub'
                checkout scm
            }
        }

        stage('Build and Test') {
            steps {
                echo 'Installing dependencies and testing React application'

                sh '''
                    docker run --rm \
                        -v "$WORKSPACE:/app" \
                        -w /app \
                        node:22-alpine \
                        sh -c "npm ci && npm run lint && npm run build"
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image'

                sh '''
                    docker build \
                        -t ${DOCKER_IMAGE}:${BUILD_NUMBER} .

                    docker tag \
                        ${DOCKER_IMAGE}:${BUILD_NUMBER} \
                        ${DOCKER_IMAGE}:latest
                '''
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        set +x
                        echo "$DOCKERHUB_TOKEN" | docker login \
                            -u "$DOCKERHUB_USERNAME" \
                            --password-stdin

                        docker push ${DOCKER_IMAGE}:${BUILD_NUMBER}
                        docker push ${DOCKER_IMAGE}:latest

                        docker logout
                    '''
                }
            }
        }

        // NEW STAGE: Test SSH connection to Application EC2
        stage('Test SSH Connection') {
            steps {
                sshagent(credentials: ['app-ec2-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=yes \
                            ec2-user@10.0.1.228 \
                            "hostname && whoami"
                    '''
                }
            }
        }

        stage('Deploy to Application EC2') {
            steps {
                echo 'Deploying new Docker image to Application EC2'

                sshagent(credentials: ['app-ec2-ssh']) {
                    sh '''
                ssh -o StrictHostKeyChecking=yes \
                    -o UserKnownHostsFile=/var/lib/jenkins/.ssh/known_hosts \
                    ec2-user@10.0.1.228 \
                    "set -e;
                     docker pull devenvsatish/catch-pokemon:${BUILD_NUMBER};
                     docker rm -f catch-pokemon 2>/dev/null || true;
                     docker run -d \
                         --name catch-pokemon \
                         -p 80:80 \
                         --restart unless-stopped \
                         devenvsatish/catch-pokemon:${BUILD_NUMBER};
                     docker ps --filter name=catch-pokemon"
            '''
                }
            }
        }

    }

    post {
        success {
            echo 'SUCCESS: Docker image built, pushed and SSH connection verified!'
        }

        failure {
            echo 'FAILED: Check Jenkins Console Output for errors.'
        }

        always {
            echo 'Pipeline execution completed.'
        }
    }
}
