module github.com/agenticsystems/markedin/cli

go 1.24.6

require (
	github.com/agenticsystems/markedin/parsers/go v0.0.0
	gopkg.in/yaml.v3 v3.0.1
)

require github.com/yuin/goldmark v1.7.17 // indirect

replace github.com/agenticsystems/markedin/parsers/go => ../parsers/go
