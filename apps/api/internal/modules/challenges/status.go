package challenges

import "fmt"

const (
	StatusDraft           = "draft"
	StatusPendingApproval = "pending_approval"
	StatusPublished       = "published"
	StatusInProgress      = "in_progress"
	StatusCompleted       = "completed"
	StatusCancelled       = "cancelled"
	StatusDisputed        = "disputed"
)

var allowedTransitions = map[string]map[string]struct{}{
	StatusDraft: {
		StatusPendingApproval: {},
		StatusPublished:       {}, // admin / auto-approve creators
		StatusCancelled:       {},
	},
	StatusPendingApproval: {
		StatusPublished: {},
		StatusDraft:     {},
		StatusCancelled: {},
	},
	StatusPublished: {
		StatusInProgress: {},
		StatusCancelled:  {},
		StatusDisputed:   {},
	},
	StatusInProgress: {
		StatusCompleted: {},
		StatusCancelled: {},
		StatusDisputed:  {},
	},
	StatusCompleted: {
		StatusDisputed: {},
	},
	StatusDisputed: {
		StatusCompleted: {},
		StatusCancelled: {},
	},
	StatusCancelled: {},
}

func CanTransition(from, to string) error {
	next, ok := allowedTransitions[from]
	if !ok {
		return fmt.Errorf("unknown status %q", from)
	}
	if _, ok := next[to]; !ok {
		return fmt.Errorf("invalid transition %s -> %s", from, to)
	}
	return nil
}
