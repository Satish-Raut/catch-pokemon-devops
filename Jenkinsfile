
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
    }

    post {
        success {
            echo 'SUCCESS: Docker image built and pushed to Docker Hub!'
        }

        failure {
            echo 'FAILED: Check Jenkins Console Output for errors.'
        }

        always {
            echo 'Pipeline execution completed.'
        }
    }
}
