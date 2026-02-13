import { Component } from "react";
import PropTypes from "prop-types";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { has_error: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { has_error: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handle_reset = () => {
    this.setState({ has_error: false, error: null });
  };

  render() {
    if (this.state.has_error) {
      return (
        <div className="panel stack" style={{ maxWidth: "500px", margin: "2rem auto" }}>
          <h2>Something went wrong</h2>
          <p className="muted">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div className="alert">
            {this.state.error?.message || "Unknown error"}
          </div>
          <div className="button-row">
            <button
              className="button"
              onClick={() => window.location.reload()}
              type="button"
            >
              Refresh page
            </button>
            <button
              className="button button--ghost"
              onClick={this.handle_reset}
              type="button"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};
