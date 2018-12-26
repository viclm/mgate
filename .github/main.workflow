workflow "Deploy on push" {
  on = "push"
  resolves = ["GitHub Action for Heroku"]
}

action "GitHub Action for Heroku" {
  uses = "actions/heroku@6db8f1c"
}
