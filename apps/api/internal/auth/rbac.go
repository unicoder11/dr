package auth

const (
	RoleParticipant    = "participant"
	RoleCreator        = "creator"
	RoleOrganizer      = "organizer"
	RoleArenaOperator  = "arena_operator"
	RoleAdmin          = "admin"
)

func HasRole(roles []string, want string) bool {
	for _, r := range roles {
		if r == want {
			return true
		}
	}
	return false
}

func HasAnyRole(roles []string, wants ...string) bool {
	for _, w := range wants {
		if HasRole(roles, w) {
			return true
		}
	}
	return false
}
