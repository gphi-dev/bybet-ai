pipeline {
    agent any
    environment {
        APP_DIR = '/srv/bybet-ai'
    }
    stages {
        stage('Pull') {
            steps {
                sh "cd ${APP_DIR} && git pull origin main"
            }
        }
        stage('Deploy') {
            steps {
                sh """
                    cd ${APP_DIR}
                    docker compose down
                    docker compose up -d --build
                """
            }
        }
    }
    post {
        failure {
            echo 'Deploy failed — check logs'
        }
    }
}
