module github.com/stonebraker/markedin/cli

go 1.24.6

require (
	github.com/stonebraker/markedin/parsers/go v0.0.0
	gopkg.in/yaml.v3 v3.0.1
)

require github.com/yuin/goldmark v1.7.17 // indirect

replace github.com/stonebraker/markedin/parsers/go => ../parsers/go
